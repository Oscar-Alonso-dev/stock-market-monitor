import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cacheFetch as fcFetch } from "./cache.js";
import { API_BASE } from "./config.js";

const REFRESH = 30000;
const RANGES  = ["1D","5D","1M","3M","6M","1Y","5Y"];
const MONO    = {fontFamily:"'JetBrains Mono',monospace"};

const fmt      = (n,d=2) => n!=null&&!isNaN(n)?Number(n).toFixed(d):"—";
const fmtPct   = n => n!=null&&!isNaN(n)?`${n>=0?"+":""}${fmt(n)}%`:"—";
const fmtMoney = n => {
  if(n==null||isNaN(n))return"—";
  const a=Math.abs(n),s=n<0?"-":"";
  if(a>=1e6)return`${s}$${(a/1e6).toFixed(2)}M`;
  if(a>=1e3)return`${s}$${(a/1e3).toFixed(2)}K`;
  return`${s}$${a.toFixed(2)}`;
};
const fmtTime=(ts,range)=>{
  const d=new Date(ts*1000);
  if(range==="1D"||range==="5D")return d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
  return d.toLocaleDateString("es-ES",{day:"2-digit",month:"short"});
};
const today=()=>new Date().toISOString().slice(0,10);

// Calcula precio medio ponderado desde aportaciones
const calcWAP=(contributions=[])=>{
  const totalShares=contributions.reduce((a,c)=>a+(c.shares||0),0);
  if(!totalShares)return 0;
  const totalCost=contributions.reduce((a,c)=>a+((c.shares||0)*(c.price||0)),0);
  return totalCost/totalShares;
};
const calcTotalShares=(contributions=[])=>contributions.reduce((a,c)=>a+(c.shares||0),0);

// ── ÁREA CON GRADIENTE ────────────────────────────────────────────────────────
const AreaChart=({points,range,prevClose})=>{
  const [hov,setHov]=useState(null);
  const [w,setW]=useState(640);
  const ref=useRef(null),svgRef=useRef(null);
  useEffect(()=>{
    const obs=new ResizeObserver(e=>{const v=e[0]?.contentRect?.width;if(v)setW(Math.max(300,v));});
    if(ref.current)obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);
  if(!points||points.length<2)return(
    <div style={{height:260,display:"flex",alignItems:"center",justifyContent:"center",color:"#2d3748",fontSize:13}}>Sin datos</div>
  );
  const W=w,H=260,PL=10,PR=10,PT=14,PB=28;
  const cw=W-PL-PR,ch=H-PT-PB;
  const prices=points.map(p=>p.price);
  const allP=[...prices];if(prevClose)allP.push(prevClose);
  const minP=Math.min(...allP),maxP=Math.max(...allP);
  const pad=(maxP-minP)*0.08||1;
  const yMin=minP-pad,yMax=maxP+pad,yRng=yMax-yMin;
  const xp=i=>PL+(i/(points.length-1))*cw;
  const yp=v=>PT+ch-((v-yMin)/yRng)*ch;
  const pathD=points.map((p,i)=>`${i===0?"M":"L"}${xp(i).toFixed(1)},${yp(p.price).toFixed(1)}`).join(" ");
  const areaD=`${pathD} L${xp(points.length-1).toFixed(1)},${(PT+ch).toFixed(1)} L${PL},${(PT+ch).toFixed(1)} Z`;
  const last=prices[prices.length-1];
  const isUp=last>=(prevClose||prices[0]);
  const color=isUp?"#22c55e":"#ef4444";
  const gid=`g${Math.random().toString(36).slice(2,7)}`;
  const step=Math.max(1,Math.floor(points.length/5));
  const xLabels=[0,1,2,3,4].map(i=>Math.min(i*step,points.length-1));
  const yLabels=[0,.33,.66,1].map(f=>({v:yMin+f*yRng,yp:PT+ch*(1-f)}));
  const onMove=e=>{
    const r=svgRef.current?.getBoundingClientRect();if(!r)return;
    const i=Math.round(((e.clientX-r.left-PL)/cw)*(points.length-1));
    if(i>=0&&i<points.length)setHov(i);
  };
  return(
    <div ref={ref} style={{position:"relative"}}>
      <div style={{minHeight:28,padding:"4px 12px",background:"#0d1520",borderBottom:"1px solid #1a2535",
        display:"flex",gap:16,alignItems:"center",...MONO,fontSize:11}}>
        {hov!=null?(
          <>
            <span style={{color:"#4a5568"}}>{fmtTime(points[hov].ts,range)}</span>
            <span style={{color:"#f1f5f9",fontWeight:600}}>${fmt(points[hov].price,4)}</span>
            {(points[hov].vol||0)>0&&<span style={{color:"#334155"}}>Vol {((points[hov].vol||0)/1e6).toFixed(2)}M</span>}
          </>
        ):<span style={{color:"#2d3748"}}>Mueve el cursor sobre el gráfico</span>}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block"}}
        onMouseMove={onMove} onMouseLeave={()=>setHov(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".25"/>
            <stop offset="100%" stopColor={color} stopOpacity=".01"/>
          </linearGradient>
        </defs>
        {yLabels.map((l,i)=><line key={i} x1={PL} x2={W-PR} y1={l.yp} y2={l.yp} stroke="#1a2535" strokeWidth={1}/>)}
        {prevClose&&<line x1={PL} x2={W-PR} y1={yp(prevClose)} y2={yp(prevClose)} stroke="#334155" strokeWidth={1} strokeDasharray="5 4"/>}
        <path d={areaD} fill={`url(#${gid})`}/>
        <path d={pathD} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round"/>
        {hov!=null&&<>
          <line x1={xp(hov)} x2={xp(hov)} y1={PT} y2={PT+ch} stroke="#2a3a50" strokeWidth={1} strokeDasharray="3 3"/>
          <circle cx={xp(hov)} cy={yp(points[hov].price)} r={4} fill={color} stroke="#0b0f18" strokeWidth={2}/>
        </>}
        {hov==null&&<circle cx={xp(points.length-1)} cy={yp(last)} r={3.5} fill={color} stroke="#0b0f18" strokeWidth={2}/>}
        {yLabels.map((l,i)=><text key={i} x={PL+3} y={l.yp-3} fill="#2d3748" fontSize={9} fontFamily="'JetBrains Mono',monospace">${fmt(l.v,2)}</text>)}
        {xLabels.map((i,k)=><text key={k} x={xp(i)} y={H-6} textAnchor="middle" fill="#2d3748" fontSize={9} fontFamily="'JetBrains Mono',monospace">{fmtTime(points[i].ts,range)}</text>)}
        {prevClose&&<text x={W-PR-4} y={yp(prevClose)-3} textAnchor="end" fill="#334155" fontSize={9} fontFamily="'JetBrains Mono',monospace">PC ${fmt(prevClose,2)}</text>}
      </svg>
    </div>
  );
};

// ── PANEL GRÁFICA ─────────────────────────────────────────────────────────────
const ChartPanel=({position,onClose})=>{
  const [range,setRange]=useState("1D");
  const [chart,setChart]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [cd,setCd]=useState(30);
  const tRef=useRef(null),cRef=useRef(null);
  const load=useCallback(async(r,silent=false)=>{
    if(!silent){setLoading(true);setError("");}
    try{
      const res=await fetch(`${API_BASE}/stocks/${position.symbol}/chart?range=${r}`);
      if(!res.ok)throw new Error();
      setChart(await res.json());
    }catch{setError("No se pudieron cargar los datos.");}
    setLoading(false);setCd(30);
  },[position.symbol]);
  useEffect(()=>{
    load(range);
    tRef.current=setInterval(()=>load(range,true),REFRESH);
    cRef.current=setInterval(()=>setCd(c=>c>0?c-1:30),1000);
    return()=>{clearInterval(tRef.current);clearInterval(cRef.current);};
  },[load,range]);
  const isUp=(chart?.change_pct??0)>=0;
  const color=isUp?"#22c55e":"#ef4444";
  const wap=calcWAP(position.contributions);
  const shares=calcTotalShares(position.contributions);
  const cur=chart?.current;
  const posVal=cur?cur*shares:null;
  const posCost=wap*shares;
  const posGL=posVal!=null?posVal-posCost:null;
  const posGLPct=posCost>0&&posGL!=null?(posGL/posCost)*100:null;
  return(
    <div style={{background:"#0f1620",border:"1px solid #1e2a3a",borderRadius:10,overflow:"hidden"}}>
      <div style={{padding:"13px 16px",borderBottom:"1px solid #1e2a3a",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"baseline",gap:12}}>
          <span style={{...MONO,fontSize:16,color:"#f59e0b",fontWeight:700}}>{position.symbol}</span>
          <span style={{fontSize:11,color:"#4a5568"}}>{position.type==="fund"?"Fondo":"Acción"}</span>
          {chart&&<>
            <span style={{...MONO,fontSize:22,color:"#f1f5f9"}}>${fmt(chart.current,4)}</span>
            <span style={{...MONO,fontSize:12,color,background:`${color}18`,padding:"2px 8px",borderRadius:4}}>
              {isUp?"▲":"▼"} {fmtPct(chart.change_pct)}
            </span>
            <span style={{fontSize:11,color:"#2d3748",background:chart.market_state==="REGULAR"?"#22c55e15":"#1e2a3a",padding:"2px 7px",borderRadius:3}}>
              {chart.market_state==="REGULAR"?"● Abierto":"○ Cerrado"}
            </span>
          </>}
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          <span style={{...MONO,fontSize:10,color:"#2d3748",marginRight:4}}>↺ {cd}s</span>
          {RANGES.map(r=>(
            <button key={r} onClick={()=>{setRange(r);load(r);}}
              style={{background:range===r?"#1e3050":"transparent",border:`1px solid ${range===r?"#2a4070":"#1e2a3a"}`,
                borderRadius:4,padding:"3px 9px",color:range===r?"#60a5fa":"#4a5568",
                fontSize:11,fontFamily:"inherit",cursor:"pointer"}}>
              {r}
            </button>
          ))}
          <button onClick={onClose}
            style={{background:"transparent",border:"1px solid #1e2a3a",borderRadius:5,padding:"3px 10px",color:"#4a5568",fontSize:13,fontFamily:"inherit",cursor:"pointer",marginLeft:4}}
            onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
            onMouseLeave={e=>e.currentTarget.style.color="#4a5568"}>✕</button>
        </div>
      </div>
      {chart&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",borderBottom:"1px solid #1e2a3a"}}>
          {[
            {l:"Precio medio (WAP)", v:`$${fmt(wap)}`},
            {l:"Participaciones",    v:fmt(shares,4)},
            {l:"Valor posición",     v:fmtMoney(posVal),   c:"#e2e8f0"},
            {l:"G/P total",          v:fmtMoney(posGL),    c:posGL>=0?"#22c55e":"#ef4444"},
            {l:"Rentabilidad",       v:fmtPct(posGLPct),   c:posGLPct>=0?"#22c55e":"#ef4444"},
          ].map((s,i)=>(
            <div key={i} style={{padding:"9px 14px",borderRight:i<4?"1px solid #1e2a3a":"none"}}>
              <div style={{fontSize:9,color:"#2d3748",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</div>
              <div style={{...MONO,fontSize:13,color:s.c||"#94a3b8"}}>{s.v}</div>
            </div>
          ))}
        </div>
      )}
      <div>
        {loading?(
          <div style={{height:260,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}>
            <span style={{fontSize:12,color:"#334155"}}>Cargando datos...</span>
            <div style={{width:120,height:2,background:"#1e2a3a",borderRadius:1,overflow:"hidden"}}>
              <div style={{width:"50%",height:"100%",background:"#f59e0b",animation:"slide 1s ease-in-out infinite"}}/>
            </div>
          </div>
        ):error?(
          <div style={{height:260,display:"flex",alignItems:"center",justifyContent:"center",color:"#ef4444",fontSize:13}}>⚠ {error}</div>
        ):chart?.points?(
          <AreaChart points={chart.points} range={range} prevClose={chart.prev_close}/>
        ):null}
      </div>
      {chart&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderTop:"1px solid #1e2a3a"}}>
          {[
            {l:"Apertura",    v:`$${fmt(chart.points?.[0]?.price)}`},
            {l:"Prev. cierre",v:`$${fmt(chart.prev_close)}`},
            {l:"Divisa",      v:chart.currency||"—"},
            {l:"Mercado",     v:chart.exchange||"—"},
          ].map((s,i)=>(
            <div key={i} style={{padding:"8px 14px",borderRight:i<3?"1px solid #1e2a3a":"none"}}>
              <div style={{fontSize:9,color:"#2d3748",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</div>
              <div style={{...MONO,fontSize:12,color:"#64748b"}}>{s.v}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── HISTORIAL DCA ─────────────────────────────────────────────────────────────
const DCAHistory=({contributions,currentPrice,onDelete})=>{
  if(!contributions||contributions.length===0)return null;
  return(
    <div style={{background:"#0b0f18",border:"1px solid #1e2a3a",borderRadius:8,overflow:"hidden",marginTop:8}}>
      <div style={{padding:"8px 12px",borderBottom:"1px solid #1e2a3a",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:"0.07em"}}>
        Historial de aportaciones ({contributions.length})
      </div>
      {[...contributions].sort((a,b)=>new Date(b.date)-new Date(a.date)).map((c,i)=>{
        const gl=currentPrice?(currentPrice-c.price)*c.shares:null;
        const glPct=currentPrice?((currentPrice-c.price)/c.price)*100:null;
        const isUp=(glPct||0)>=0;
        const color=isUp?"#22c55e":"#ef4444";
        return(
          <div key={i} style={{display:"grid",gridTemplateColumns:"90px 80px 80px 1fr 80px 24px",gap:8,padding:"8px 12px",
            borderBottom:i<contributions.length-1?"1px solid #0f1520":"none",alignItems:"center"}}>
            <div style={{...MONO,fontSize:11,color:"#4a5568"}}>{c.date||"—"}</div>
            <div style={{...MONO,fontSize:11,color:"#cbd5e1"}}>{fmt(c.shares,4)} part.</div>
            <div style={{...MONO,fontSize:11,color:"#94a3b8"}}>${fmt(c.price,4)}</div>
            <div style={{...MONO,fontSize:11,color:"#4a5568"}}>{fmtMoney((c.shares||0)*(c.price||0))} invertido</div>
            {gl!=null?(
              <div style={{...MONO,fontSize:11,color}}>{fmtPct(glPct)}</div>
            ):<div/>}
            <button onClick={()=>onDelete(i)}
              style={{background:"transparent",border:"none",color:"#2d3748",fontSize:12,cursor:"pointer",padding:0}}
              onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
              onMouseLeave={e=>e.currentTarget.style.color="#2d3748"}>✕</button>
          </div>
        );
      })}
    </div>
  );
};

// ── FORMULARIO APORTACIÓN ─────────────────────────────────────────────────────
const ContributionForm=({symbol,existingSymbols,onAdd,onCancel,isNew=false})=>{
  const [sym,setSym]       = useState(symbol||"");
  const [shares,setShares] = useState("");
  const [price,setPrice]   = useState("");
  const [date,setDate]     = useState(today());
  const [type,setType]     = useState("stock");
  const [name,setName]     = useState("");
  const [results,setResults]=useState([]);

  const searchSym=async q=>{
    setSym(q);
    if(q.length<1){setResults([]);return;}
    try{
      const r=await fetch(`${API_BASE}/stocks/search/${q}`);
      const d=await r.json();
      setResults((d.result||[]).slice(0,6));
    }catch{}
  };

  const submit=()=>{
    if(!sym||!shares||!price)return;
    onAdd({
      symbol:sym.toUpperCase(),
      name:name||sym.toUpperCase(),
      type,
      contribution:{shares:parseFloat(shares),price:parseFloat(price),date},
    });
  };

  const inp={width:"100%",background:"#0b0f18",border:"1px solid #1e2a3a",borderRadius:6,
    padding:"9px 12px",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"};

  return(
    <div style={{background:"#111827",border:"1px solid #2a3a50",borderRadius:10,padding:20}}>
      <div style={{fontSize:13,fontWeight:600,color:"#e2e8f0",marginBottom:14}}>
        {isNew?"Nueva posición":"Nueva aportación"} {symbol&&`— ${symbol}`}
      </div>

      {isNew&&(
        <>
          {/* Tipo */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:10,color:"#334155",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tipo</div>
            <div style={{display:"flex",gap:6}}>
              {[{k:"stock",l:"Acción"},{k:"fund",l:"Fondo / ETF"}].map(t=>(
                <button key={t.k} onClick={()=>setType(t.k)}
                  style={{background:type===t.k?"#1e3050":"transparent",border:`1px solid ${type===t.k?"#2a4070":"#1e2a3a"}`,
                    borderRadius:6,padding:"6px 16px",color:type===t.k?"#60a5fa":"#4a5568",
                    fontSize:12,fontFamily:"inherit",cursor:"pointer"}}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Ticker */}
          <div style={{marginBottom:12,position:"relative"}}>
            <div style={{fontSize:10,color:"#334155",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>
              {type==="fund"?"Ticker Yahoo Finance (ej: 0P0000TKWD.F)":"Ticker (ej: AAPL, MSFT)"}
            </div>
            <input value={sym} onChange={e=>searchSym(e.target.value)} placeholder={type==="fund"?"0P0000TKWD.F":"AAPL"} style={inp}/>
            {results.length>0&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1a2535",border:"1px solid #2a3a50",borderRadius:6,zIndex:50,marginTop:2}}>
                {results.map((r,i)=>(
                  <div key={i} onClick={()=>{setSym(r.symbol);setName(r.description||r.symbol);setResults([]);}}
                    style={{padding:"8px 12px",cursor:"pointer",fontSize:12,borderBottom:i<results.length-1?"1px solid #1e2a3a":"none"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#141e2e"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{color:"#f59e0b",...MONO}}>{r.symbol}</span>
                    <span style={{color:"#4a5568",marginLeft:8}}>{(r.description||"").slice(0,30)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Datos de la aportación */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
        <div>
          <div style={{fontSize:10,color:"#334155",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Participaciones</div>
          <input type="number" value={shares} onChange={e=>setShares(e.target.value)} placeholder="10" style={inp}/>
        </div>
        <div>
          <div style={{fontSize:10,color:"#334155",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Precio por participación ($)</div>
          <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="150.00" style={inp}/>
        </div>
        <div>
          <div style={{fontSize:10,color:"#334155",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Fecha</div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp}/>
        </div>
      </div>

      {/* Resumen */}
      {shares&&price&&(
        <div style={{background:"#0b0f18",border:"1px solid #1e2a3a",borderRadius:6,padding:"10px 14px",marginBottom:14,
          display:"flex",gap:20,alignItems:"center",...MONO,fontSize:12}}>
          <span style={{color:"#4a5568"}}>Total invertido:</span>
          <span style={{color:"#f59e0b",fontWeight:600}}>${fmt(parseFloat(shares||0)*parseFloat(price||0))}</span>
        </div>
      )}

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onCancel} style={{background:"transparent",border:"1px solid #1e2a3a",borderRadius:6,padding:"8px 16px",color:"#4a5568",fontSize:12,fontFamily:"inherit",cursor:"pointer"}}>Cancelar</button>
        <button onClick={submit} style={{background:"#f59e0b",border:"none",borderRadius:6,padding:"8px 18px",color:"#000",fontSize:12,fontWeight:700,fontFamily:"inherit",cursor:"pointer"}}>
          {isNew?"Crear posición":"Añadir aportación"}
        </button>
      </div>
    </div>
  );
};

// ── TARJETA DE POSICIÓN ───────────────────────────────────────────────────────
const PositionCard=({pos,isSelected,onClick,onRemove,onAddContribution,currentPrice})=>{
  const [showDCA,setShowDCA]=useState(false);
  const [showAddForm,setShowAddForm]=useState(false);
  const wap=calcWAP(pos.contributions);
  const shares=calcTotalShares(pos.contributions);
  const cur=currentPrice||wap;
  const val=cur*shares,cost=wap*shares;
  const gl=val-cost,glPct=cost>0?(gl/cost)*100:0;
  const isUp=glPct>=0;
  const color=isUp?"#22c55e":"#ef4444";
  const nContribs=pos.contributions?.length||0;

  return(
    <div style={{position:"relative"}}>
      <div style={{
        background:isSelected?"#141e2e":"#111827",
        border:`1px solid ${isSelected?"#2a3a50":"#1e2a3a"}`,
        borderLeft:`3px solid ${isSelected?color:"#1e2a3a"}`,
        borderRadius:8,overflow:"hidden",transition:"all .2s",
      }}>
        {/* Main row */}
        <div onClick={onClick} style={{padding:"12px 14px",cursor:"pointer"}}
          onMouseEnter={e=>{ if(!isSelected)e.currentTarget.parentElement.style.background="#131c2b"; }}
          onMouseLeave={e=>{ if(!isSelected)e.currentTarget.parentElement.style.background="#111827"; }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{...MONO,fontSize:14,color:"#f59e0b",fontWeight:600}}>{pos.symbol}</span>
                <span style={{fontSize:10,color:"#2d3748",background:"#1e2a3a",padding:"1px 6px",borderRadius:3}}>
                  {pos.type==="fund"?"FONDO":"ACCIÓN"}
                </span>
                <span style={{fontSize:10,color:"#334155"}}>{nContribs} aport.</span>
              </div>
              <div style={{fontSize:11,color:"#4a5568",marginTop:2}}>
                {fmt(shares,4)} partic. · WAP ${fmt(wap,4)}
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{...MONO,fontSize:14,color:"#f1f5f9"}}>${fmt(cur,2)}</div>
              <div style={{...MONO,fontSize:11,color,background:`${color}15`,padding:"1px 6px",borderRadius:3,display:"inline-block",marginTop:2}}>
                {isUp?"▲":"▼"} {fmtPct(glPct)}
              </div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            <div style={{background:"#0b0f18",borderRadius:5,padding:"6px 10px"}}>
              <div style={{fontSize:9,color:"#2d3748",marginBottom:1,textTransform:"uppercase",letterSpacing:"0.06em"}}>Valor</div>
              <div style={{...MONO,fontSize:12,color:"#cbd5e1"}}>{fmtMoney(val)}</div>
            </div>
            <div style={{background:"#0b0f18",borderRadius:5,padding:"6px 10px"}}>
              <div style={{fontSize:9,color:"#2d3748",marginBottom:1,textTransform:"uppercase",letterSpacing:"0.06em"}}>G/P</div>
              <div style={{...MONO,fontSize:12,color}}>{fmtMoney(gl)}</div>
            </div>
          </div>
          {isSelected&&<div style={{fontSize:10,color:"#f59e0b",marginTop:6,textAlign:"center"}}>▸ viendo gráfica</div>}
        </div>

        {/* Botones DCA */}
        <div style={{borderTop:"1px solid #111827",display:"flex",gap:0}}>
          <button onClick={e=>{e.stopPropagation();setShowAddForm(v=>!v);setShowDCA(false);}}
            style={{flex:1,background:"transparent",border:"none",borderRight:"1px solid #111827",
              padding:"7px",color:"#4a5568",fontSize:11,fontFamily:"inherit",cursor:"pointer",transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#f59e0b"}
            onMouseLeave={e=>e.currentTarget.style.color="#4a5568"}>
            + Aportación
          </button>
          <button onClick={e=>{e.stopPropagation();setShowDCA(v=>!v);setShowAddForm(false);}}
            style={{flex:1,background:"transparent",border:"none",borderRight:"1px solid #111827",
              padding:"7px",color:"#4a5568",fontSize:11,fontFamily:"inherit",cursor:"pointer",transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#60a5fa"}
            onMouseLeave={e=>e.currentTarget.style.color="#4a5568"}>
            {showDCA?"▲ Ocultar":"▼ Historial DCA"}
          </button>
          <button onClick={e=>{e.stopPropagation();onRemove();}}
            style={{background:"transparent",border:"none",padding:"7px 12px",color:"#2d3748",fontSize:12,cursor:"pointer",transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
            onMouseLeave={e=>e.currentTarget.style.color="#2d3748"}>✕</button>
        </div>
      </div>

      {/* Form nueva aportación */}
      {showAddForm&&(
        <div style={{marginTop:6}}>
          <ContributionForm
            symbol={pos.symbol}
            isNew={false}
            onAdd={({contribution})=>{
              onAddContribution(pos.symbol,contribution);
              setShowAddForm(false);
            }}
            onCancel={()=>setShowAddForm(false)}
          />
        </div>
      )}

      {/* Historial DCA */}
      {showDCA&&(
        <DCAHistory
          contributions={pos.contributions}
          currentPrice={currentPrice}
          onDelete={i=>onAddContribution(pos.symbol,null,i)}
        />
      )}
    </div>
  );
};

// ── PORTFOLIO PRINCIPAL ───────────────────────────────────────────────────────
export default function Portfolio(){
  const [positions,setPositions]=useState(()=>{
    try{
      const saved=JSON.parse(localStorage.getItem("portfolio_v2")||"null");
      if(saved)return saved;
      // Migrar formato antiguo si existe
      const old=JSON.parse(localStorage.getItem("portfolio")||"[]");
      return old.map(p=>({
        symbol:p.symbol,
        name:p.symbol,
        type:"stock",
        contributions:[{shares:p.shares||0,price:p.avgPrice||0,date:today()}],
      }));
    }catch{return[];}
  });
  const [prices,setPrices]    =useState({});
  const [selected,setSelected]=useState(null);
  const [showForm,setShowForm]=useState(false);
  const [lastUpdate,setLastUpdate]=useState(null);
  const tRef=useRef(null);
  const firstRender=useRef(true);

  // Guardar en localStorage (saltar primer render)
  useEffect(()=>{
    if(firstRender.current){firstRender.current=false;return;}
    localStorage.setItem("portfolio_v2",JSON.stringify(positions));
  },[positions]);

  // Cargar precios en tiempo real
  const loadPrices=useCallback(async()=>{
    if(!positions.length)return;
    try{
      const syms=[...new Set(positions.map(p=>p.symbol))].join(",");
      const data=await fcFetch(`${API_BASE}/market/quotes?symbols=${syms}`,20000);
      const map={};
      data.forEach(d=>{if(!d.error)map[d.symbol]=d;});
      setPrices(map);
      setLastUpdate(new Date());
    }catch{}
  },[positions]);

  useEffect(()=>{
    loadPrices();
    tRef.current=setInterval(loadPrices,REFRESH);
    return()=>clearInterval(tRef.current);
  },[loadPrices]);

  // Añadir nueva posición o aportación a existente
  const handleAdd=({symbol,name,type,contribution})=>{
    setPositions(prev=>{
      const idx=prev.findIndex(p=>p.symbol===symbol);
      if(idx>=0){
        // Ya existe — añadir aportación
        const updated=[...prev];
        updated[idx]={...updated[idx],contributions:[...updated[idx].contributions,contribution]};
        return updated;
      }
      // Nueva posición
      return[...prev,{symbol,name:name||symbol,type:type||"stock",contributions:[contribution]}];
    });
    setShowForm(false);
  };

  // Añadir aportación a posición existente
  const handleAddContribution=(symbol,contribution,deleteIdx=null)=>{
    setPositions(prev=>prev.map(p=>{
      if(p.symbol!==symbol)return p;
      if(deleteIdx!=null){
        const contribs=[...p.contributions];
        contribs.splice(deleteIdx,1);
        return{...p,contributions:contribs};
      }
      return{...p,contributions:[...p.contributions,contribution]};
    }));
  };

  const removePosition=symbol=>{
    setPositions(prev=>prev.filter(p=>p.symbol!==symbol));
    if(selected===symbol)setSelected(null);
  };

  // Calcular totales
  const enriched=useMemo(()=>positions.map(p=>{
    const wap=calcWAP(p.contributions);
    const shares=calcTotalShares(p.contributions);
    const cur=prices[p.symbol]?.current_price||wap;
    const val=cur*shares,cost=wap*shares;
    return{...p,wap,shares,cur,val,cost,gl:val-cost,glPct:cost>0?((val-cost)/cost)*100:0};
  }),[positions,prices]);

  const totalVal=enriched.reduce((a,p)=>a+p.val,0);
  const totalCost=enriched.reduce((a,p)=>a+p.cost,0);
  const totalGL=totalVal-totalCost;
  const totalGLPct=totalCost>0?(totalGL/totalCost)*100:0;
  const best=[...enriched].sort((a,b)=>b.glPct-a.glPct)[0];
  const worst=[...enriched].sort((a,b)=>a.glPct-b.glPct)[0];
  const totalContribs=positions.reduce((a,p)=>a+(p.contributions?.length||0),0);

  return(
    <div style={{background:"#0b0f18",minHeight:"100vh",color:"#e2e8f0",fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        @keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none}
        input[type=date]{color-scheme:dark}
      `}</style>
      <div style={{maxWidth:1440,margin:"0 auto",padding:"24px 28px"}}>

        {/* HEADER */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:"#f1f5f9"}}>Mi Portfolio</div>
            <div style={{fontSize:12,color:"#4a5568",marginTop:3}}>
              {positions.length} posiciones · {totalContribs} aportaciones
              {lastUpdate&&` · ${lastUpdate.toLocaleTimeString("es-ES")}`}
            </div>
          </div>
          <button onClick={()=>setShowForm(true)}
            style={{background:"#f59e0b",border:"none",borderRadius:7,padding:"9px 18px",color:"#000",fontSize:13,fontWeight:700,fontFamily:"inherit",cursor:"pointer"}}>
            + Nueva posición
          </button>
        </div>

        {/* FORMULARIO */}
        {showForm&&(
          <div style={{marginBottom:16}}>
            <ContributionForm isNew={true} onAdd={handleAdd} onCancel={()=>setShowForm(false)}/>
          </div>
        )}

        {positions.length===0?(
          <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:10,padding:80,textAlign:"center"}}>
            <div style={{fontSize:14,color:"#4a5568",marginBottom:6}}>Portfolio vacío</div>
            <div style={{fontSize:12,color:"#2d3748",marginBottom:16}}>Añade acciones o fondos con soporte de múltiples aportaciones DCA</div>
            <button onClick={()=>setShowForm(true)}
              style={{background:"#f59e0b",border:"none",borderRadius:7,padding:"10px 20px",color:"#000",fontSize:13,fontWeight:700,fontFamily:"inherit",cursor:"pointer"}}>
              + Añadir primera posición
            </button>
          </div>
        ):(
          <>
            {/* RESUMEN */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:16}}>
              {[
                {l:"Valor total",    v:fmtMoney(totalVal),   c:"#f1f5f9"},
                {l:"Invertido",      v:fmtMoney(totalCost),  c:"#94a3b8"},
                {l:"G/P total",      v:fmtMoney(totalGL),    c:totalGL>=0?"#22c55e":"#ef4444"},
                {l:"Rentabilidad",   v:fmtPct(totalGLPct),   c:totalGLPct>=0?"#22c55e":"#ef4444"},
                {l:"Posiciones",     v:positions.length,     c:"#64748b"},
                {l:"Aportaciones",   v:totalContribs,        c:"#64748b"},
              ].map((s,i)=>(
                <div key={i} style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:8,padding:"12px 14px"}}>
                  <div style={{fontSize:9,color:"#2d3748",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.07em"}}>{s.l}</div>
                  <div style={{...MONO,fontSize:18,color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* MEJOR / PEOR */}
            {enriched.length>1&&best&&worst&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                {[
                  {label:"Mejor posición",pos:best, color:"#22c55e"},
                  {label:"Peor posición", pos:worst,color:"#ef4444"},
                ].map((s,i)=>(
                  <div key={i} style={{background:"#111827",border:`1px solid ${s.color}20`,borderRadius:8,padding:"11px 16px",
                    display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}}
                    onClick={()=>setSelected(s.pos.symbol)}>
                    <div>
                      <div style={{fontSize:10,color:"#334155",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.label}</div>
                      <div style={{...MONO,fontSize:15,color:"#f59e0b"}}>{s.pos.symbol}</div>
                      <div style={{fontSize:11,color:"#4a5568"}}>{s.pos.contributions?.length||0} aportaciones · WAP ${fmt(s.pos.wap)}</div>
                    </div>
                    <div style={{...MONO,fontSize:20,color:s.color}}>{fmtPct(s.pos.glPct)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* LISTA + GRÁFICA */}
            <div style={{display:"grid",gridTemplateColumns:selected?"300px 1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:12,alignItems:"start"}}>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {enriched.map(pos=>(
                  <PositionCard key={pos.symbol} pos={pos}
                    isSelected={selected===pos.symbol}
                    currentPrice={prices[pos.symbol]?.current_price}
                    onClick={()=>setSelected(selected===pos.symbol?null:pos.symbol)}
                    onRemove={()=>removePosition(pos.symbol)}
                    onAddContribution={handleAddContribution}
                  />
                ))}
              </div>
              {selected&&(
                <ChartPanel
                  key={selected}
                  position={positions.find(p=>p.symbol===selected)||{symbol:selected,contributions:[]}}
                  onClose={()=>setSelected(null)}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
