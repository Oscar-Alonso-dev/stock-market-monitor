import { useState, useEffect, useCallback, useRef } from "react";
import { API_BASE } from "./config.js";

// ── CACHÉ FRONTEND (compartida con otros módulos) ────────────────────────────
import { cacheFetch as fcFetch } from "./cache.js";


// ── UTILIDADES ────────────────────────────────────────────────────────────────
const fmt    = (n,d=2)  => n!=null&&!isNaN(n)?Number(n).toFixed(d):"—";
const fmtPct = n => n!=null&&!isNaN(n)?`${n>=0?"+":""}${Number(n).toFixed(2)}%`:"—";
const fmtBig = n => {
  if(n==null||isNaN(n))return"—";
  const a=Math.abs(n),s=n<0?"-":"";
  if(a>=1e12)return`${s}${(a/1e12).toFixed(2)}T`;
  if(a>=1e9) return`${s}${(a/1e9).toFixed(2)}B`;
  if(a>=1e6) return`${s}${(a/1e6).toFixed(2)}M`;
  if(a>=1e3) return`${s}${(a/1e3).toFixed(1)}K`;
  return`${s}${a.toFixed(0)}`;
};
const fmtPctVal = n => n!=null&&!isNaN(n)?`${(Number(n)*100).toFixed(2)}%`:"—";
const MONO = {fontFamily:"'JetBrains Mono',monospace"};

// ── LOGO CON FALLBACK AUTOMÁTICO ─────────────────────────────────────────────
// Fuente 1: companiesmarketcap (alta calidad)
// Fuente 2: favicon oficial del dominio
// Fuente 3: inicial del ticker
const getLogo = ticker => {
  const t = (ticker||"").replace(/\.(MC|DE|PA|AS|L|MI|SW|KS|T|NS|F)$/i,"").toUpperCase();
  return [
    `https://companiesmarketcap.com/img/company-logos/64/${t}.webp`,
    `https://assets.parqet.com/logos/symbol/${t}?format=jpg`,
  ];
};

const StockLogo = ({ticker, name, size=28}) => {
  const sources = getLogo(ticker);
  const [idx, setIdx] = useState(0);
  const src = sources[idx];
  if (!src) return (
    <div style={{width:size,height:size,flexShrink:0,borderRadius:6,
      background:"linear-gradient(135deg,#1e2a3a,#0d1520)",
      border:"1px solid #2a3a50",display:"flex",alignItems:"center",
      justifyContent:"center",fontSize:Math.round(size*0.42),
      color:"#f59e0b",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>
      {(ticker||name||"?")[0].toUpperCase()}
    </div>
  );
  return (
    <img src={src} alt={name||ticker} width={size} height={size}
      onError={()=>setIdx(i=>i+1)}
      style={{borderRadius:6,objectFit:"contain",background:"#fff",
        padding:2,flexShrink:0}} />
  );
};

const RANGES = ["1D","5D","1M","3M","6M","1Y","5Y"];
const TAB_COLOR = "#f59e0b";

// ── GRÁFICA DE PRECIO ─────────────────────────────────────────────────────────
const PriceChart = ({points,range,prevClose,color})=>{
  const [hov,setHov] = useState(null);
  const [w,setW]     = useState(700);
  const ref=useRef(null), svgRef=useRef(null);
  useEffect(()=>{
    const obs=new ResizeObserver(e=>{const v=e[0]?.contentRect?.width;if(v)setW(Math.max(320,v));});
    if(ref.current)obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);
  if(!points||points.length<2)return(
    <div style={{height:240,display:"flex",alignItems:"center",justifyContent:"center",color:"#2d3748",fontSize:12}}>Sin datos de precio</div>
  );
  const W=w,H=240,PL=58,PR=12,PT=12,PB=26;
  const cw=W-PL-PR,ch=H-PT-PB;
  const prices=points.map(p=>p.price);
  const allP=[...prices]; if(prevClose)allP.push(prevClose);
  const minP=Math.min(...allP),maxP=Math.max(...allP);
  const pad=(maxP-minP)*0.08||1;
  const yMin=minP-pad,yMax=maxP+pad,yRng=yMax-yMin;
  const xp=i=>PL+(i/(points.length-1))*cw;
  const yp=v=>PT+ch-((v-yMin)/yRng)*ch;
  const pd=points.map((p,i)=>`${i===0?"M":"L"}${xp(i).toFixed(1)},${yp(p.price).toFixed(1)}`).join(" ");
  const last=prices[prices.length-1];
  const c=color||(last>=(prevClose||prices[0])?"#22c55e":"#ef4444");
  const gid=`pc${Math.random().toString(36).slice(2,6)}`;
  const ad=`${pd} L${xp(points.length-1).toFixed(1)},${(PT+ch).toFixed(1)} L${PL},${(PT+ch).toFixed(1)} Z`;
  const ylbls=[0,.25,.5,.75,1].map(f=>({v:yMin+f*yRng,y:PT+ch*(1-f)}));
  const step=Math.max(1,Math.floor(points.length/5));
  const xlbls=[0,1,2,3,4].map(i=>Math.min(i*step,points.length-1));
  const fmtT=ts=>{
    const d=new Date(ts*1000);
    if(range==="1D"||range==="5D")return d.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"});
    return d.toLocaleDateString("es-ES",{day:"2-digit",month:"short"});
  };
  const onMove=e=>{
    const r=svgRef.current?.getBoundingClientRect();if(!r)return;
    const i=Math.round(((e.clientX-r.left-PL)/cw)*(points.length-1));
    if(i>=0&&i<points.length)setHov(i);
  };
  return(
    <div ref={ref}>
      <div style={{height:26,padding:"0 12px",background:"#0d1520",borderBottom:"1px solid #1a2535",
        display:"flex",gap:16,alignItems:"center",...MONO,fontSize:11}}>
        {hov!=null?(
          <>
            <span style={{color:"#4a5568"}}>{fmtT(points[hov].ts)}</span>
            <span style={{color:"#f1f5f9",fontWeight:600}}>{fmt(points[hov].price,4)}</span>
            {points[hov].vol>0&&<span style={{color:"#334155"}}>Vol {fmtBig(points[hov].vol)}</span>}
            <span style={{color:c}}>{fmtPct(((points[hov].price-(prevClose||prices[0]))/(prevClose||prices[0]))*100)}</span>
          </>
        ):<span style={{color:"#2d3748"}}>Mueve el cursor sobre el gráfico</span>}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block"}}
        onMouseMove={onMove} onMouseLeave={()=>setHov(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity=".2"/>
            <stop offset="100%" stopColor={c} stopOpacity=".01"/>
          </linearGradient>
        </defs>
        {ylbls.map((l,i)=><line key={i} x1={PL} x2={W-PR} y1={l.y} y2={l.y} stroke="#1a2535" strokeWidth={1}/>)}
        {prevClose&&<line x1={PL} x2={W-PR} y1={yp(prevClose)} y2={yp(prevClose)} stroke="#334155" strokeWidth={1} strokeDasharray="5 4"/>}
        <path d={ad} fill={`url(#${gid})`}/>
        <path d={pd} fill="none" stroke={c} strokeWidth={1.8} strokeLinejoin="round"/>
        {hov!=null&&<>
          <line x1={xp(hov)} x2={xp(hov)} y1={PT} y2={PT+ch} stroke="#2a3a50" strokeWidth={1} strokeDasharray="3 3"/>
          <circle cx={xp(hov)} cy={yp(points[hov].price)} r={4} fill={c} stroke="#0b0f18" strokeWidth={2}/>
        </>}
        {hov==null&&<circle cx={xp(points.length-1)} cy={yp(last)} r={3.5} fill={c} stroke="#0b0f18" strokeWidth={2}/>}
        {ylbls.map((l,i)=>(
          <text key={i} x={PL-4} y={l.y+3} textAnchor="end" fill="#334155" fontSize={9} fontFamily="'JetBrains Mono',monospace">
            {fmt(l.v,2)}
          </text>
        ))}
        {xlbls.map((i,k)=>(
          <text key={k} x={xp(i)} y={H-4} textAnchor="middle" fill="#2d3748" fontSize={9} fontFamily="'JetBrains Mono',monospace">
            {fmtT(points[i].ts)}
          </text>
        ))}
      </svg>
    </div>
  );
};

// ── GRÁFICO DE BARRAS (revenue, net income, FCF) ──────────────────────────────
const BarChart = ({data, keys, colors, title, formatFn=fmtBig})=>{
  const [hov,setHov]=useState(null);
  if(!data||data.length===0)return null;
  const W=500, H=180, PL=56, PR=12, PT=16, PB=24;
  const cw=W-PL-PR, ch=H-PT-PB;
  const allVals=data.flatMap(d=>keys.map(k=>Math.abs(d[k]||0)));
  const maxVal=Math.max(...allVals,1);
  const barW=Math.floor(cw/data.length/(keys.length+0.5));
  const groupW=cw/data.length;
  return(
    <div>
      <div style={{fontSize:10,color:"#334155",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block"}}
        onMouseLeave={()=>setHov(null)}>
        {[0,.25,.5,.75,1].map((f,i)=>{
          const y=PT+ch*(1-f);
          return<g key={i}>
            <line x1={PL} x2={W-PR} y1={y} y2={y} stroke="#1a2535" strokeWidth={1}/>
            <text x={PL-4} y={y+3} textAnchor="end" fill="#2d3748" fontSize={8} fontFamily="'JetBrains Mono',monospace">
              {formatFn(maxVal*f)}
            </text>
          </g>;
        })}
        {data.map((d,gi)=>(
          <g key={gi}>
            {keys.map((k,ki)=>{
              const val=d[k]||0;
              const barH=Math.max(0,(Math.abs(val)/maxVal)*ch);
              const x=PL+gi*groupW+ki*(barW+2)+4;
              const y=val>=0?PT+ch-barH:PT+ch;
              const isHov=hov&&hov.gi===gi&&hov.ki===ki;
              return(
                <rect key={ki} x={x} y={y} width={barW} height={barH}
                  fill={colors[ki]} opacity={isHov?1:0.75} rx={2}
                  style={{cursor:"pointer"}}
                  onMouseEnter={()=>setHov({gi,ki,val,label:d.year,key:k})}/>
              );
            })}
            <text x={PL+gi*groupW+groupW/2} y={H-6} textAnchor="middle"
              fill="#2d3748" fontSize={8} fontFamily="'JetBrains Mono',monospace">
              {d.year}
            </text>
          </g>
        ))}
        {hov&&(
          <text x={PL+6} y={PT+8} fill="#e2e8f0" fontSize={9} fontFamily="'JetBrains Mono',monospace">
            {hov.label} · {hov.key}: {formatFn(hov.val)}
          </text>
        )}
      </svg>
      <div style={{display:"flex",gap:12,marginTop:4}}>
        {keys.map((k,i)=>(
          <div key={k} style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:8,height:8,background:colors[i],borderRadius:2}}/>
            <span style={{fontSize:10,color:"#4a5568"}}>{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── RATIO CON BARRA ───────────────────────────────────────────────────────────
const RatioBar = ({label,value,min,max,unit="",decimals=2,invert=false,hint})=>{
  if(value==null||isNaN(value))return null;
  const v=parseFloat(value);
  const pct=Math.max(0,Math.min(100,((v-min)/(max-min))*100));
  const good=invert?pct<35:pct<65;
  const color=good?"#22c55e":pct>85?"#ef4444":"#f59e0b";
  return(
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
        <span style={{fontSize:11,color:"#4a5568"}}>{label}{hint&&<span style={{fontSize:9,color:"#2d3748",marginLeft:4}}>({hint})</span>}</span>
        <span style={{...MONO,fontSize:12,color:"#e2e8f0"}}>{fmt(v,decimals)}{unit}</span>
      </div>
      <div style={{height:3,background:"#1e2a3a",borderRadius:2,overflow:"hidden"}}>
        <div style={{width:`${pct}%`,height:"100%",background:color,borderRadius:2,transition:"width .3s"}}/>
      </div>
    </div>
  );
};

// ── RATIO BOX ─────────────────────────────────────────────────────────────────
const RBox = ({label,value,hint,color})=>(
  <div style={{background:"#0b0f18",border:"1px solid #1e2a3a",borderRadius:7,padding:"10px 13px"}}>
    <div style={{fontSize:9,color:"#2d3748",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</div>
    <div style={{...MONO,fontSize:15,color:color||"#e2e8f0"}}>{value||"—"}</div>
    {hint&&<div style={{fontSize:9,color:"#334155",marginTop:2}}>{hint}</div>}
  </div>
);

// ── SECCIÓN COLAPSABLE ────────────────────────────────────────────────────────
const Section = ({title,icon,children,defaultOpen=true})=>{
  const [open,setOpen]=useState(defaultOpen);
  return(
    <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:10,overflow:"hidden",marginBottom:12}}>
      <div onClick={()=>setOpen(o=>!o)}
        style={{padding:"11px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",
          borderBottom:open?"1px solid #1e2a3a":"none"}}
        onMouseEnter={e=>e.currentTarget.style.background="#141e2e"}
        onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <span style={{fontSize:12,fontWeight:600,color:"#94a3b8",letterSpacing:"0.04em"}}>
          {icon&&<span style={{marginRight:7}}>{icon}</span>}{title}
        </span>
        <span style={{color:"#334155",fontSize:12}}>{open?"▲":"▼"}</span>
      </div>
      {open&&<div style={{padding:"14px 18px"}}>{children}</div>}
    </div>
  );
};

// ── STOCK DETAIL ──────────────────────────────────────────────────────────────
export default function StockDetail({symbol,onClose}){
  const [detail,setDetail]       = useState(null);
  const [chart,setChart]         = useState(null);
  const [range,setRange]         = useState("1D");
  const [loading,setLoading]     = useState(true);
  const [loadingChart,setLChart] = useState(false);
  const [error,setError]         = useState("");
  const [cd,setCd]               = useState(30);
  const tRef=useRef(null), cRef=useRef(null);

  useEffect(()=>{
    if(!symbol)return;
    setLoading(true); setError(""); setDetail(null);
    fcFetch(`${API_BASE}/stocks/${symbol}/detail`, 300000)
      .then(d=>{setDetail(d);setLoading(false);})
      .catch(()=>{setError("No se encontraron datos para este símbolo.");setLoading(false);});
  },[symbol]);

  const loadChart=useCallback(async r=>{
    setLChart(true);
    try{
      const data=await fcFetch(`${API_BASE}/stocks/${symbol}/chart?range=${r}`,
        r==="1D"?30000:r==="5D"?120000:3600000);
      setChart(data);
    }catch{}
    setLChart(false); setCd(30);
  },[symbol]);

  useEffect(()=>{
    loadChart(range);
    tRef.current=setInterval(()=>loadChart(range),30000);
    cRef.current=setInterval(()=>setCd(c=>c>0?c-1:30),1000);
    return()=>{clearInterval(tRef.current);clearInterval(cRef.current);};
  },[loadChart,range]);

  if(!symbol)return null;
  const isUp=(detail?.change_pct||0)>=0;
  const color=isUp?"#22c55e":"#ef4444";
  const pv=n=>{const v=parseFloat(n);return isNaN(v)?null:v;};

  return(
    <div style={{background:"#0b0f18",minHeight:"100vh",fontFamily:"'Inter',sans-serif",color:"#e2e8f0"}}>
      <style>{`@keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
      <div style={{maxWidth:1300,margin:"0 auto",padding:"20px 24px"}}>

        {/* BREADCRUMB */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <button onClick={onClose}
            style={{background:"transparent",border:"1px solid #1e2a3a",borderRadius:6,
              padding:"6px 14px",color:"#4a5568",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}
            onMouseEnter={e=>e.currentTarget.style.color="#f1f5f9"}
            onMouseLeave={e=>e.currentTarget.style.color="#4a5568"}>
            ← Volver
          </button>
          <span style={{color:"#2d3748"}}>›</span>
          <span style={{...MONO,fontSize:13,color:TAB_COLOR}}>{symbol}</span>
          {detail?.name&&<span style={{fontSize:12,color:"#334155"}}>— {detail.name}</span>}
        </div>

        {loading&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:400,flexDirection:"column",gap:12}}>
            <span style={{fontSize:13,color:"#334155"}}>Cargando datos de mercado y financieros...</span>
            <div style={{width:180,height:2,background:"#1e2a3a",borderRadius:1,overflow:"hidden"}}>
              <div style={{width:"60%",height:"100%",background:TAB_COLOR,animation:"slide 1s ease-in-out infinite"}}/>
            </div>
          </div>
        )}

        {error&&(
          <div style={{padding:60,textAlign:"center",color:"#ef4444",fontSize:14}}>{error}</div>
        )}

        {!loading&&!error&&detail&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 360px",gap:14,alignItems:"start"}}>

            {/* ── COLUMNA IZQUIERDA ────────────────────────────────────────── */}
            <div>

              {/* HEADER PRECIO */}
              <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:10,padding:"18px 22px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                      <StockLogo ticker={symbol} name={detail?.name} size={40}/>
                      <span style={{...MONO,fontSize:24,color:TAB_COLOR,fontWeight:700}}>{symbol}</span>
                      {detail.sector&&<span style={{fontSize:11,color:"#4a5568",background:"#1e2a3a",padding:"2px 8px",borderRadius:4}}>{detail.sector}</span>}
                      {detail.industry&&<span style={{fontSize:11,color:"#334155",border:"1px solid #1e2a3a",padding:"2px 8px",borderRadius:4}}>{detail.industry}</span>}
                      <span style={{fontSize:11,color:detail.market_state==="REGULAR"?"#22c55e":"#4a5568",
                        background:detail.market_state==="REGULAR"?"#22c55e15":"#1e2a3a",padding:"2px 8px",borderRadius:4}}>
                        {detail.market_state==="REGULAR"?"● Abierto":"○ Cerrado"}
                      </span>
                    </div>
                    <div style={{fontSize:15,color:"#cbd5e1",fontWeight:500}}>{detail.name}</div>
                    <div style={{fontSize:11,color:"#334155",marginTop:3,display:"flex",gap:10}}>
                      {detail.exchange&&<span>{detail.exchange}</span>}
                      {detail.currency&&<span>· {detail.currency}</span>}
                      {detail.country&&<span>· {detail.country}</span>}
                      {detail.ceo&&<span>· CEO: {detail.ceo}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{...MONO,fontSize:38,color:"#f1f5f9",lineHeight:1}}>{fmt(detail.current,4)}</div>
                    <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6,alignItems:"center"}}>
                      <span style={{...MONO,fontSize:15,color,background:`${color}18`,padding:"3px 10px",borderRadius:5}}>
                        {isUp?"▲":"▼"} {fmtPct(detail.change_pct)}
                      </span>
                      <span style={{...MONO,fontSize:11,color:"#334155"}}>PC {fmt(detail.prev_close,4)}</span>
                    </div>
                  </div>
                </div>

                {/* Stats rápidas */}
                <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginTop:14,paddingTop:14,borderTop:"1px solid #1e2a3a"}}>
                  {[
                    {l:"Market Cap",   v:fmtBig(pv(detail.market_cap))},
                    {l:"Volumen",      v:fmtBig(detail.volume)},
                    {l:"52W Máx",      v:fmt(detail["52w_high"])},
                    {l:"52W Mín",      v:fmt(detail["52w_low"])},
                    {l:"Empleados",    v:detail.employees?Number(detail.employees).toLocaleString():"—"},
                    {l:"Beta",         v:fmt(detail.beta,3)},
                  ].map((s,i)=>(
                    <div key={i}>
                      <div style={{fontSize:9,color:"#2d3748",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</div>
                      <div style={{...MONO,fontSize:13,color:"#94a3b8"}}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GRÁFICA PRECIO */}
              <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:10,overflow:"hidden",marginBottom:12}}>
                <div style={{padding:"9px 14px",borderBottom:"1px solid #1e2a3a",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{display:"flex",gap:4}}>
                    {RANGES.map(r=>(
                      <button key={r} onClick={()=>{setRange(r);loadChart(r);}}
                        style={{background:range===r?"#1e3050":"transparent",border:`1px solid ${range===r?"#2a4070":"#1e2a3a"}`,
                          borderRadius:4,padding:"4px 10px",color:range===r?"#60a5fa":"#4a5568",
                          fontSize:11,fontFamily:"inherit",cursor:"pointer"}}>
                        {r}
                      </button>
                    ))}
                  </div>
                  <span style={{...MONO,fontSize:10,color:"#2d3748"}}>↺ {cd}s</span>
                </div>
                {loadingChart?(
                  <div style={{height:266,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{fontSize:12,color:"#334155"}}>Actualizando...</span>
                  </div>
                ):(
                  <PriceChart points={chart?.points} range={range} prevClose={chart?.prev_close} color={color}/>
                )}
              </div>

              {/* ESTADOS FINANCIEROS */}
              {detail.income_chart&&detail.income_chart.length>0&&(
                <Section title="Cuenta de Resultados" icon="📊">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
                    <BarChart
                      data={detail.income_chart}
                      keys={["revenue","grossProfit","netIncome"]}
                      colors={["#3b82f6","#22c55e","#f59e0b"]}
                      title="Revenue · Beneficio bruto · Beneficio neto"
                    />
                    <BarChart
                      data={detail.income_chart}
                      keys={["eps"]}
                      colors={["#a78bfa"]}
                      title="EPS (Beneficio por acción)"
                      formatFn={n=>n!=null?`$${fmt(n,2)}`:"—"}
                    />
                  </div>
                  {/* Tabla */}
                  <div style={{marginTop:16,overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",...MONO,fontSize:11}}>
                      <thead>
                        <tr style={{borderBottom:"1px solid #1e2a3a"}}>
                          {["Año","Revenue","Bruto","EBITDA","Neto","EPS"].map(h=>(
                            <th key={h} style={{padding:"6px 10px",textAlign:"right",color:"#334155",fontWeight:600,
                              textTransform:"uppercase",letterSpacing:"0.06em",fontSize:9,
                              ...(h==="Año"?{textAlign:"left"}:{})}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...detail.income_chart].reverse().map((r,i)=>(
                          <tr key={i} style={{borderBottom:"1px solid #111827"}}
                            onMouseEnter={e=>e.currentTarget.style.background="#141e2e"}
                            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <td style={{padding:"7px 10px",color:TAB_COLOR}}>{r.year}</td>
                            <td style={{padding:"7px 10px",textAlign:"right",color:"#94a3b8"}}>{fmtBig(r.revenue)}</td>
                            <td style={{padding:"7px 10px",textAlign:"right",color:"#94a3b8"}}>{fmtBig(r.grossProfit)}</td>
                            <td style={{padding:"7px 10px",textAlign:"right",color:"#94a3b8"}}>{fmtBig(r.ebitda)}</td>
                            <td style={{padding:"7px 10px",textAlign:"right",color:r.netIncome>=0?"#22c55e":"#ef4444"}}>{fmtBig(r.netIncome)}</td>
                            <td style={{padding:"7px 10px",textAlign:"right",color:"#94a3b8"}}>{r.eps!=null?`$${fmt(r.eps,2)}`:"—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              )}

              {/* CASH FLOW */}
              {detail.cashflow_chart&&detail.cashflow_chart.length>0&&(
                <Section title="Flujo de Caja" icon="💵">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
                    <BarChart
                      data={detail.cashflow_chart}
                      keys={["operatingCF","freeCF"]}
                      colors={["#3b82f6","#22c55e"]}
                      title="Cash Flow operativo · Free Cash Flow"
                    />
                    <BarChart
                      data={detail.cashflow_chart}
                      keys={["capex","dividends"]}
                      colors={["#ef4444","#f59e0b"]}
                      title="Capex · Dividendos pagados"
                    />
                  </div>
                </Section>
              )}

            </div>

            {/* ── COLUMNA DERECHA ──────────────────────────────────────────── */}
            <div>

              {/* VALORACIÓN */}
              {(detail.per||detail.ev_ebitda||detail.p_book)&&(
                <Section title="Valoración" icon="📐">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                    <RBox label="PER" value={fmt(pv(detail.per),2)}
                      hint="Precio / Beneficio"
                      color={pv(detail.per)>30?"#f59e0b":pv(detail.per)<15?"#22c55e":null}/>
                    <RBox label="Forward PER" value={fmt(pv(detail.forward_per),2)} hint="PER estimado"/>
                    <RBox label="PEG" value={fmt(pv(detail.peg),2)}
                      hint="PER / Crecimiento"
                      color={pv(detail.peg)<1?"#22c55e":pv(detail.peg)>3?"#ef4444":null}/>
                    <RBox label="P/Book" value={fmt(pv(detail.p_book),2)} hint="Precio / Valor contable"/>
                    <RBox label="EV/EBITDA" value={fmt(pv(detail.ev_ebitda),2)}
                      hint="Enterprise Value / EBITDA"
                      color={pv(detail.ev_ebitda)<10?"#22c55e":pv(detail.ev_ebitda)>25?"#ef4444":null}/>
                    <RBox label="P/FCF" value={fmt(pv(detail.p_fcf),2)} hint="Precio / Free Cash Flow"/>
                    <RBox label="P/Ventas" value={fmt(pv(detail.p_sales),2)} hint="Precio / Revenue"/>
                    <RBox label="EV/Revenue" value={fmt(pv(detail.ev_revenue),2)} hint="EV / Revenue"/>
                  </div>
                </Section>
              )}

              {/* RENTABILIDAD */}
              {(detail.roe||detail.margin_net)&&(
                <Section title="Rentabilidad y Márgenes" icon="📈">
                  <RatioBar label="ROE — Retorno sobre patrimonio" value={pv(detail.roe)!=null?pv(detail.roe)*100:null} min={-10} max={50} unit="%" decimals={1} hint="bueno >15%"/>
                  <RatioBar label="ROA — Retorno sobre activos"    value={pv(detail.roa)!=null?pv(detail.roa)*100:null}  min={-5}  max={25} unit="%" decimals={1}/>
                  <RatioBar label="ROIC — Retorno sobre capital"   value={pv(detail.roic)!=null?pv(detail.roic)*100:null} min={-5}  max={40} unit="%" decimals={1} hint="bueno >WACC"/>
                  <RatioBar label="Margen bruto"     value={pv(detail.margin_gross)!=null?pv(detail.margin_gross)*100:null} min={0} max={100} unit="%" decimals={1}/>
                  <RatioBar label="Margen operativo" value={pv(detail.margin_op)!=null?pv(detail.margin_op)*100:null}     min={-20} max={50} unit="%" decimals={1}/>
                  <RatioBar label="Margen neto"      value={pv(detail.margin_net)!=null?pv(detail.margin_net)*100:null}   min={-20} max={40} unit="%" decimals={1}/>
                  <RatioBar label="Margen FCF"       value={pv(detail.margin_fcf)!=null?pv(detail.margin_fcf)*100:null}  min={-10} max={40} unit="%" decimals={1}/>
                </Section>
              )}

              {/* DEUDA Y LIQUIDEZ */}
              {(detail.debt_equity||detail.current_ratio)&&(
                <Section title="Deuda y Liquidez" icon="🏦">
                  <RatioBar label="Deuda / Patrimonio" value={pv(detail.debt_equity)} min={0} max={5} decimals={2} invert hint="menor es mejor"/>
                  <RatioBar label="Ratio corriente"    value={pv(detail.current_ratio)} min={0} max={4} decimals={2} hint="bueno >1.5"/>
                  <RatioBar label="Ratio rápido"       value={pv(detail.quick_ratio)}   min={0} max={3} decimals={2} hint="bueno >1"/>
                  {detail.net_debt!=null&&(
                    <div style={{marginTop:8,padding:"8px 12px",background:"#0b0f18",border:"1px solid #1e2a3a",borderRadius:6}}>
                      <div style={{fontSize:9,color:"#2d3748",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Deuda neta</div>
                      <div style={{...MONO,fontSize:14,color:pv(detail.net_debt)<0?"#22c55e":"#94a3b8"}}>{fmtBig(pv(detail.net_debt))}</div>
                    </div>
                  )}
                </Section>
              )}

              {/* DIVIDENDO */}
              {pv(detail.dividend_yield)>0&&(
                <Section title="Dividendo" icon="💰">
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                    <RBox label="Yield" value={`${(pv(detail.dividend_yield)*100).toFixed(2)}%`} color="#22c55e"/>
                    <RBox label="Último dividendo" value={`$${fmt(pv(detail.last_dividend),4)}`}/>
                    <RBox label="Payout ratio" value={fmtPctVal(detail.dividend_payout)}
                      color={pv(detail.dividend_payout)>0.8?"#ef4444":null}
                      hint="% del beneficio"/>
                  </div>
                </Section>
              )}

              {/* EMPRESA */}
              {detail.description&&(
                <Section title="Sobre la empresa" icon="🏢" defaultOpen={false}>
                  <p style={{fontSize:12,color:"#64748b",lineHeight:1.75,margin:0}}>{detail.description}</p>
                  {detail.website&&(
                    <a href={detail.website} target="_blank" rel="noreferrer"
                      style={{display:"inline-block",marginTop:10,fontSize:11,color:TAB_COLOR}}>
                      🌐 {detail.website}
                    </a>
                  )}
                </Section>
              )}

              {/* PEERS */}
              {detail.peers&&detail.peers.length>0&&(
                <Section title="Empresas similares" icon="🔗" defaultOpen={false}>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {detail.peers.filter(p=>p.symbol).map((p,i)=>(
                      <div key={i}
                        style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                          padding:"8px 10px",background:"#0b0f18",border:"1px solid #1e2a3a",
                          borderRadius:6,cursor:"pointer"}}
                        onClick={()=>{
                          // Navegar al peer — recargar el componente con nuevo símbolo
                          window.dispatchEvent(new CustomEvent("navigate-stock",{detail:{symbol:p.symbol}}));
                        }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#2a3a50"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="#1e2a3a"}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <StockLogo ticker={p.symbol} name={p.name} size={26}/>
                          <div>
                            <div style={{...MONO,fontSize:12,color:TAB_COLOR}}>{p.symbol}</div>
                            <div style={{fontSize:11,color:"#4a5568",marginTop:1}}>{p.name}</div>
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          {p.price&&<div style={{...MONO,fontSize:12,color:"#94a3b8"}}>${fmt(p.price)}</div>}
                          {p.mkt_cap&&<div style={{fontSize:10,color:"#334155"}}>{fmtBig(p.mkt_cap)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <div style={{fontSize:10,color:"#2d3748",textAlign:"right",marginTop:4}}>
                Datos: Yahoo Finance + FMP · Fundamentales caché 24h
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
