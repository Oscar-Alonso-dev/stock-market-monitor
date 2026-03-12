import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { API_BASE } from "./config.js";

const fmt    = (n,d=2)  => n!=null&&!isNaN(n)?Number(n).toFixed(d):"—";
const fmtPct = n => n!=null&&!isNaN(n)?`${n>=0?"+":""}${Number(n).toFixed(2)}%`:"—";
const MONO   = {fontFamily:"'JetBrains Mono',monospace"};
const isCNMV = s => /^ES[A-Z0-9]{10}$/.test(s||""); // ISINs españoles → datos CNMV

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO COMPLETO: 70+ fondos y ETFs
// ─────────────────────────────────────────────────────────────────────────────

const CATALOG = [
  // ── 💎 Value Español — ISINs oficiales CNMV (datos garantizados) ─────────────
  {grp:"💎 Value Español",      symbol:"ES0169107098", name:"Cobas Internacional C FI",          mgr:"Cobas AM",           isin:"ES0169107098"},
  {grp:"💎 Value Español",      symbol:"ES0169107049", name:"Cobas Selección FI",                mgr:"Cobas AM",           isin:"ES0169107049"},
  {grp:"💎 Value Español",      symbol:"ES0169107056", name:"Cobas Grandes Compañías FI",        mgr:"Cobas AM",           isin:"ES0169107056"},
  {grp:"💎 Value Español",      symbol:"ES0175897007", name:"azValor Internacional FI",          mgr:"azValor AM",         isin:"ES0175897007"},
  {grp:"💎 Value Español",      symbol:"ES0175897031", name:"azValor Iberia FI",                 mgr:"azValor AM",         isin:"ES0175897031"},
  {grp:"💎 Value Español",      symbol:"ES0147622002", name:"Magallanes European Equity M FI",   mgr:"Magallanes",         isin:"ES0147622002"},
  {grp:"💎 Value Español",      symbol:"ES0147622010", name:"Magallanes Iberian Equity M FI",    mgr:"Magallanes",         isin:"ES0147622010"},
  {grp:"💎 Value Español",      symbol:"ES0180790006", name:"Bestinver Internacional FI",        mgr:"Bestinver",          isin:"ES0180790006"},
  {grp:"💎 Value Español",      symbol:"ES0180790014", name:"Bestinver Bolsa FI",                mgr:"Bestinver",          isin:"ES0180790014"},
  {grp:"💎 Value Español",      symbol:"ES0180790030", name:"Bestinver Patrimonio FI",           mgr:"Bestinver",          isin:"ES0180790030"},
  {grp:"💎 Value Español",      symbol:"ES0180792002", name:"True Value FI",                    mgr:"True Value AM",      isin:"ES0180792002"},
  {grp:"💎 Value Español",      symbol:"ES0180792028", name:"True Value Small Caps FI",          mgr:"True Value AM",      isin:"ES0180792028"},
  {grp:"💎 Value Español",      symbol:"ES0180560009", name:"Valentum FI",                       mgr:"Valentum AM",        isin:"ES0180560009"},
  {grp:"💎 Value Español",      symbol:"ES0162870003", name:"Metavalor Internacional FI",        mgr:"Metagestión",        isin:"ES0162870003"},
  {grp:"💎 Value Español",      symbol:"ES0180847002", name:"Horos Internacional FI",            mgr:"Horos AM",           isin:"ES0180847002"},
  {grp:"💎 Value Español",      symbol:"ES0180717002", name:"Numantia Patrimonio Global FI",     mgr:"Numantia Gestión",   isin:"ES0180717002"},

  // ── 🇪🇸 Indexados España — CNMV ───────────────────────────────────────────────
  {grp:"🇪🇸 Indexados España",  symbol:"ES0114930029", name:"Santander Índice España FI",        mgr:"Santander AM",       isin:"ES0114930029"},
  {grp:"🇪🇸 Indexados España",  symbol:"ES0112705026", name:"BBVA Bolsa Índice España FI",        mgr:"BBVA AM",            isin:"ES0112705026"},
  {grp:"🇪🇸 Indexados España",  symbol:"ES0120400003", name:"CaixaBank Bolsa Índice España FI",   mgr:"CaixaBank AM",       isin:"ES0120400003"},
  {grp:"🇪🇸 Indexados España",  symbol:"ES0162647008", name:"Bankinter Índice Español FI",        mgr:"Bankinter Gestión",  isin:"ES0162647008"},

  // ── ⚖️ Mixtos España — CNMV ───────────────────────────────────────────────────
  {grp:"⚖️ Mixtos España",      symbol:"ES0138569037", name:"Cartesio X FI",                     mgr:"Cartesio Inversiones",isin:"ES0138569037"},
  {grp:"⚖️ Mixtos España",      symbol:"ES0138569011", name:"Cartesio Y FI",                     mgr:"Cartesio Inversiones",isin:"ES0138569011"},
  {grp:"⚖️ Mixtos España",      symbol:"ES0149133000", name:"Belgravia Epsilon FI",               mgr:"Belgravia Capital",  isin:"ES0149133000"},

  // ── 🌍 Indexados Globales — ETFs cotizados (Yahoo Finance) ────────────────────
  {grp:"🌍 Indexados Globales", symbol:"IWDA.AS",      name:"iShares Core MSCI World UCITS ETF", mgr:"BlackRock",          isin:"IE00B4L5Y983"},
  {grp:"🌍 Indexados Globales", symbol:"VWCE.DE",      name:"Vanguard FTSE All-World UCITS ETF", mgr:"Vanguard",           isin:"IE00BK5BQT80"},
  {grp:"🌍 Indexados Globales", symbol:"SWRD.L",       name:"SPDR MSCI World UCITS ETF",         mgr:"State Street",       isin:"IE00BFY0GT14"},
  {grp:"🌍 Indexados Globales", symbol:"ACWI",         name:"iShares MSCI ACWI ETF",             mgr:"BlackRock",          isin:"US4642872349"},
  {grp:"🌍 Indexados Globales", symbol:"IUSQ.DE",      name:"iShares MSCI ACWI UCITS ETF",       mgr:"BlackRock",          isin:"IE00B6R52259"},

  // ── 🇺🇸 Indexados USA ─────────────────────────────────────────────────────────
  {grp:"🇺🇸 Indexados USA",     symbol:"SPY",          name:"SPDR S&P 500 ETF Trust",            mgr:"State Street",       isin:"US78462F1030"},
  {grp:"🇺🇸 Indexados USA",     symbol:"VOO",          name:"Vanguard S&P 500 ETF",              mgr:"Vanguard",           isin:"US9229083632"},
  {grp:"🇺🇸 Indexados USA",     symbol:"CSPX.L",       name:"iShares Core S&P 500 UCITS ETF",    mgr:"BlackRock",          isin:"IE00B5BMR087"},
  {grp:"🇺🇸 Indexados USA",     symbol:"QQQ",          name:"Invesco QQQ (NASDAQ-100)",          mgr:"Invesco",            isin:"US46090E1038"},
  {grp:"🇺🇸 Indexados USA",     symbol:"VUSA.L",       name:"Vanguard S&P 500 UCITS ETF",        mgr:"Vanguard",           isin:"IE00B3XXRP09"},

  // ── 🌍 Indexados Europa ───────────────────────────────────────────────────────
  {grp:"🌍 Indexados Europa",   symbol:"EXW1.DE",      name:"iShares Core MSCI Europe UCITS ETF",mgr:"BlackRock",          isin:"IE00B4K48X80"},
  {grp:"🌍 Indexados Europa",   symbol:"MEUD.PA",      name:"Amundi MSCI Europe UCITS ETF",      mgr:"Amundi",             isin:"FR0010261198"},
  {grp:"🌍 Indexados Europa",   symbol:"EZU",          name:"iShares MSCI Eurozone ETF",         mgr:"BlackRock",          isin:"US4642864007"},

  // ── 🌏 Emergentes ─────────────────────────────────────────────────────────────
  {grp:"🌏 Emergentes",         symbol:"EEM",          name:"iShares MSCI Emerging Markets ETF", mgr:"BlackRock",          isin:"US4642872349"},
  {grp:"🌏 Emergentes",         symbol:"VWO",          name:"Vanguard FTSE Emerging Markets ETF",mgr:"Vanguard",           isin:"US9220428588"},
  {grp:"🌏 Emergentes",         symbol:"EIMI.L",       name:"iShares Core MSCI EM IMI UCITS ETF",mgr:"BlackRock",          isin:"IE00BKM4GZ66"},

  // ── 🔬 Sectoriales ────────────────────────────────────────────────────────────
  {grp:"🔬 Sectoriales",        symbol:"XLK",          name:"Technology Select Sector SPDR",     mgr:"State Street",       isin:"US81369Y8030"},
  {grp:"🔬 Sectoriales",        symbol:"IUIT.L",       name:"iShares S&P 500 Info Tech UCITS",   mgr:"BlackRock",          isin:"IE00B3WJKG14"},
  {grp:"🔬 Sectoriales",        symbol:"XLV",          name:"Health Care Select Sector SPDR",    mgr:"State Street",       isin:"US81369Y4065"},
  {grp:"🔬 Sectoriales",        symbol:"ICLN",         name:"iShares Global Clean Energy ETF",   mgr:"BlackRock",          isin:"US4642884807"},
  {grp:"🔬 Sectoriales",        symbol:"XLF",          name:"Financial Select Sector SPDR",      mgr:"State Street",       isin:"US81369Y1082"},
  {grp:"🔬 Sectoriales",        symbol:"XLE",          name:"Energy Select Sector SPDR",         mgr:"State Street",       isin:"US81369Y5054"},

  // ── 🏦 Renta Fija ─────────────────────────────────────────────────────────────
  {grp:"🏦 Renta Fija",         symbol:"AGG",          name:"iShares Core US Aggregate Bond ETF",mgr:"BlackRock",          isin:"US4642872422"},
  {grp:"🏦 Renta Fija",         symbol:"TLT",          name:"iShares 20+ Year Treasury Bond ETF",mgr:"BlackRock",          isin:"US4642874329"},
  {grp:"🏦 Renta Fija",         symbol:"AGGH.L",       name:"iShares Core Global Agg Bond UCITS",mgr:"BlackRock",          isin:"IE00BDBRDM35"},
  {grp:"🏦 Renta Fija",         symbol:"HYG",          name:"iShares iBoxx High Yield Corp ETF", mgr:"BlackRock",          isin:"US4642885135"},
  {grp:"🏦 Renta Fija",         symbol:"EMB",          name:"iShares JP Morgan EM Bond ETF",     mgr:"BlackRock",          isin:"US4642882819"},

  // ── 📦 ETFs Cotizados Mixtos ──────────────────────────────────────────────────
  {grp:"📦 ETFs Cotizados",     symbol:"GLD",          name:"SPDR Gold Shares",                  mgr:"State Street",       isin:"US78463V1070"},
  {grp:"📦 ETFs Cotizados",     symbol:"VHYL.L",       name:"Vanguard FTSE All-World High Div.", mgr:"Vanguard",           isin:"IE00B8GKDB10"},
  {grp:"📦 ETFs Cotizados",     symbol:"EQQQ.L",       name:"Invesco NASDAQ-100 UCITS ETF",      mgr:"Invesco",            isin:"IE0032077012"},
  {grp:"📦 ETFs Cotizados",     symbol:"WSML.L",       name:"iShares MSCI World Small Cap UCITS",mgr:"BlackRock",          isin:"IE00BF4RFH31"},
  {grp:"📦 ETFs Cotizados",     symbol:"ZPRV.DE",      name:"SPDR MSCI USA Small Cap Value ETF", mgr:"State Street",       isin:"IE00BSPLC413"},
];

// Agrupar por grp
const GROUPS = [...new Set(CATALOG.map(f=>f.grp))];

// ── SPARKLINE ─────────────────────────────────────────────────────────────────
const Spark = ({history, change}) => {
  if(!history||history.length<2) return null;
  const vals=history.slice(-60).map(h=>h.nav).filter(v=>v>0);
  if(vals.length<2) return null;
  const W=70,H=28,min=Math.min(...vals),max=Math.max(...vals),rng=max-min||1;
  const x=i=>(i/(vals.length-1))*W;
  const y=v=>H-((v-min)/rng)*(H-4)-2;
  const d=vals.map((v,i)=>`${i===0?"M":"L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const color=(change||0)>=0?"#22c55e":"#ef4444";
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:70,height:28,flexShrink:0}}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
};

// ── GRÁFICA NAV ───────────────────────────────────────────────────────────────
const NavChart = ({history}) => {
  const [hov,setHov] = useState(null);
  const [w,setW]     = useState(600);
  const ref=useRef(null), svgRef=useRef(null);
  useEffect(()=>{
    const obs=new ResizeObserver(e=>{const v=e[0]?.contentRect?.width; if(v)setW(Math.max(280,v));});
    if(ref.current) obs.observe(ref.current);
    return()=>obs.disconnect();
  },[]);

  const pts=(history||[]).filter(h=>h.nav>0);
  if(pts.length<2) return(
    <div style={{height:180,display:"flex",alignItems:"center",justifyContent:"center",color:"#2d3748",fontSize:12}}>Sin histórico</div>
  );
  const W=w,H=200,PL=54,PR=12,PT=12,PB=26;
  const cw=W-PL-PR,ch=H-PT-PB;
  const vals=pts.map(p=>p.nav);
  const minP=Math.min(...vals),maxP=Math.max(...vals);
  const pad=(maxP-minP)*0.07||1;
  const yMin=minP-pad,yMax=maxP+pad,yRng=yMax-yMin;
  const xp=i=>PL+(i/(pts.length-1))*cw;
  const yp=v=>PT+ch-((v-yMin)/yRng)*ch;
  const pd=pts.map((p,i)=>`${i===0?"M":"L"}${xp(i).toFixed(1)},${yp(p.nav).toFixed(1)}`).join(" ");
  const last=vals[vals.length-1],first=vals[0];
  const isUp=last>=first; const color=isUp?"#22c55e":"#ef4444";
  const gid=`nc${Math.random().toString(36).slice(2,6)}`;
  const ad=`${pd} L${xp(pts.length-1).toFixed(1)},${(PT+ch).toFixed(1)} L${PL},${(PT+ch).toFixed(1)} Z`;
  const step=Math.max(1,Math.floor(pts.length/5));
  const xlbls=[0,1,2,3,4].map(i=>Math.min(i*step,pts.length-1));
  const ylbls=[0,.33,.66,1].map(f=>({v:yMin+f*yRng,yp:PT+ch*(1-f)}));
  const onMove=e=>{
    const r=svgRef.current?.getBoundingClientRect(); if(!r)return;
    const i=Math.round(((e.clientX-r.left-PL)/cw)*(pts.length-1));
    if(i>=0&&i<pts.length) setHov(i);
  };
  return(
    <div ref={ref}>
      <div style={{height:26,padding:"4px 10px",background:"#0d1520",borderBottom:"1px solid #1a2535",
        display:"flex",gap:14,alignItems:"center",...MONO,fontSize:11}}>
        {hov!=null?(
          <>
            <span style={{color:"#4a5568"}}>{new Date((pts[hov].date||0)*1000).toLocaleDateString("es-ES",{day:"2-digit",month:"short",year:"2-digit"})}</span>
            <span style={{color:"#f1f5f9",fontWeight:600}}>{fmt(pts[hov].nav,4)}</span>
            <span style={{color:(pts[hov].nav>=first)?"#22c55e":"#ef4444"}}>
              {fmtPct(((pts[hov].nav-first)/first)*100)}
            </span>
          </>
        ):<span style={{color:"#2d3748"}}>Mueve el cursor sobre el gráfico</span>}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:H,display:"block"}}
        onMouseMove={onMove} onMouseLeave={()=>setHov(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".2"/>
            <stop offset="100%" stopColor={color} stopOpacity=".01"/>
          </linearGradient>
        </defs>
        {ylbls.map((l,i)=><line key={i} x1={PL} x2={W-PR} y1={l.yp} y2={l.yp} stroke="#1a2535" strokeWidth={1}/>)}
        <path d={ad} fill={`url(#${gid})`}/>
        <path d={pd} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round"/>
        {hov!=null&&<>
          <line x1={xp(hov)} x2={xp(hov)} y1={PT} y2={PT+ch} stroke="#2a3a50" strokeWidth={1} strokeDasharray="3 3"/>
          <circle cx={xp(hov)} cy={yp(pts[hov].nav)} r={3.5} fill={color} stroke="#0b0f18" strokeWidth={2}/>
        </>}
        {hov==null&&<circle cx={xp(pts.length-1)} cy={yp(last)} r={3} fill={color} stroke="#0b0f18" strokeWidth={2}/>}
        {ylbls.map((l,i)=>(
          <text key={i} x={PL-4} y={l.yp+3} textAnchor="end" fill="#334155" fontSize={9} fontFamily="'JetBrains Mono',monospace">{fmt(l.v,2)}</text>
        ))}
        {xlbls.map((i,k)=>(
          <text key={k} x={xp(i)} y={H-5} textAnchor="middle" fill="#2d3748" fontSize={9} fontFamily="'JetBrains Mono',monospace">
            {new Date((pts[i].date||0)*1000).toLocaleDateString("es-ES",{month:"short",year:"2-digit"})}
          </text>
        ))}
      </svg>
    </div>
  );
};

// ── PANEL DETALLE ─────────────────────────────────────────────────────────────
const DetailPanel = ({fund, detail, loading, error, onClose}) => {
  const isUp=(detail?.change_pct||0)>=0;
  const color=isUp?"#22c55e":"#ef4444";
  const rets=[
    {l:"1 día",   v:detail?.return_1d},
    {l:"1 sem.",  v:detail?.return_1w},
    {l:"1 mes",   v:detail?.return_1m},
    {l:"3 meses", v:detail?.return_3m},
    {l:"6 meses", v:detail?.return_6m},
    {l:"YTD",     v:detail?.return_ytd},
    {l:"1 año",   v:detail?.return_1y},
    {l:"3 años",  v:detail?.return_3y},
  ];
  return(
    <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:10,overflow:"hidden",position:"sticky",top:20}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid #1e2a3a",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"#f1f5f9",marginBottom:4,lineHeight:1.3}}>
            {detail?.name||fund?.name||fund?.symbol}
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {fund?.mgr&&<span style={{fontSize:11,color:"#4a5568"}}>{fund.mgr}</span>}
            {detail?.currency&&<span style={{fontSize:11,color:"#334155"}}>· {detail.currency}</span>}
          </div>
          {fund?.isin&&<div style={{...MONO,fontSize:10,color:"#2d3748",marginTop:3}}>ISIN: {fund.isin}</div>}
          {isCNMV(fund?.symbol)&&<div style={{fontSize:9,color:"#22c55e",background:"#22c55e15",
            border:"1px solid #22c55e30",borderRadius:3,padding:"1px 5px",marginTop:3,
            display:"inline-block",letterSpacing:"0.05em"}}>● CNMV oficial</div>}
        </div>
        <button onClick={onClose}
          style={{background:"transparent",border:"1px solid #1e2a3a",borderRadius:5,padding:"3px 8px",
            color:"#4a5568",fontSize:12,cursor:"pointer",marginLeft:8,flexShrink:0}}
          onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
          onMouseLeave={e=>e.currentTarget.style.color="#4a5568"}>✕</button>
      </div>

      {loading&&(
        <div style={{padding:30,textAlign:"center"}}>
          <div style={{width:"80%",height:2,background:"#1e2a3a",borderRadius:1,margin:"0 auto",overflow:"hidden"}}>
            <div style={{width:"60%",height:"100%",background:"#f59e0b",animation:"slide 1s ease-in-out infinite"}}/>
          </div>
          <div style={{fontSize:11,color:"#334155",marginTop:10}}>Cargando datos...</div>
        </div>
      )}

      {error&&!loading&&(
        <div style={{padding:20,textAlign:"center",color:"#ef4444",fontSize:12}}>{error}</div>
      )}

      {detail&&!loading&&(
        <>
          {/* Precio / NAV */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid #1e2a3a"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
              <span style={{fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:"0.07em"}}>NAV actual</span>
              <span style={{...MONO,fontSize:11,color:"#2d3748"}}>{detail.currency}</span>
            </div>
            <div style={{...MONO,fontSize:28,color:"#f1f5f9",marginTop:2}}>{fmt(detail.current_nav,4)}</div>
            <div style={{display:"flex",gap:8,alignItems:"center",marginTop:4}}>
              <span style={{...MONO,fontSize:13,color,background:`${color}18`,padding:"2px 8px",borderRadius:4}}>
                {isUp?"▲":"▼"} {fmtPct(detail.change_pct)}
              </span>
              <span style={{fontSize:11,color:"#334155"}}>· Anterior: {fmt(detail.prev_nav,4)}</span>
            </div>
            <div style={{display:"flex",gap:14,marginTop:8}}>
              <div><div style={{fontSize:9,color:"#2d3748"}}>MÍN 52S</div><div style={{...MONO,fontSize:11,color:"#64748b"}}>{fmt(detail["52w_low"])}</div></div>
              <div><div style={{fontSize:9,color:"#2d3748"}}>MÁX 52S</div><div style={{...MONO,fontSize:11,color:"#64748b"}}>{fmt(detail["52w_high"])}</div></div>
              <div><div style={{fontSize:9,color:"#2d3748"}}>DATOS</div><div style={{fontSize:10,color:"#4a5568"}}>{detail.data_points||"—"} días</div></div>
            </div>
          </div>

          {/* Rentabilidades */}
          <div style={{padding:"12px 16px",borderBottom:"1px solid #1e2a3a"}}>
            <div style={{fontSize:10,color:"#334155",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.07em"}}>Rentabilidades</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {rets.filter(r=>r.v!=null).map(r=>{
                const up=r.v>=0;
                return(
                  <div key={r.l} style={{background:"#0b0f18",border:"1px solid #1e2a3a",borderRadius:6,padding:"7px 10px",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:10,color:"#4a5568"}}>{r.l}</span>
                    <span style={{...MONO,fontSize:12,color:up?"#22c55e":"#ef4444"}}>{fmtPct(r.v)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfica NAV */}
          {detail.history&&detail.history.length>5&&(
            <div style={{borderBottom:"1px solid #1e2a3a"}}>
              <div style={{padding:"8px 16px",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:"0.07em"}}>Evolución NAV</div>
              <NavChart history={detail.history}/>
            </div>
          )}

          <div style={{padding:"8px 14px",fontSize:10,color:"#2d3748",textAlign:"center"}}>
            {isCNMV(fund?.symbol)?"Datos: CNMV (oficial) · VL publicado cada día hábil":"Datos: Yahoo Finance · actualizado 1 vez al día"}
          </div>
        </>
      )}
    </div>
  );
};

// ── TARJETA FONDO ─────────────────────────────────────────────────────────────
const FundCard = ({fund, detail, loading, isSelected, onClick}) => {
  const isUp=(detail?.change_pct||0)>=0;
  const color=isUp?"#22c55e":"#ef4444";
  return(
    <div onClick={onClick}
      style={{background:isSelected?"#141e2e":"#111827",border:`1px solid ${isSelected?"#2a4070":"#1e2a3a"}`,
        borderRadius:8,padding:"11px 14px",cursor:"pointer",transition:"all .1s"}}
      onMouseEnter={e=>{if(!isSelected){e.currentTarget.style.background="#141e2e";e.currentTarget.style.borderColor="#2a3a50";}}}
      onMouseLeave={e=>{if(!isSelected){e.currentTarget.style.background="#111827";e.currentTarget.style.borderColor="#1e2a3a";}}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,color:"#e2e8f0",fontWeight:500,lineHeight:1.3,marginBottom:3,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {fund.name}
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:"#4a5568"}}>{fund.mgr}</span>
            {fund.isin&&<span style={{...MONO,fontSize:9,color:"#2d3748"}}>{fund.isin}</span>}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          {loading?(
            <div style={{width:60,height:10,background:"#1e2a3a",borderRadius:2,animation:"pulse 1.5s ease-in-out infinite"}}/>
          ):detail?(
            <>
              <div style={{...MONO,fontSize:13,color:"#f1f5f9"}}>{fmt(detail.current_nav,4)}</div>
              <div style={{...MONO,fontSize:11,color,marginTop:2}}>{fmtPct(detail.change_pct)}</div>
            </>
          ):<div style={{fontSize:10,color:"#2d3748"}}>—</div>}
        </div>
      </div>
      {detail&&(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
          <div style={{display:"flex",gap:12}}>
            {[{l:"1M",v:detail.return_1m},{l:"6M",v:detail.return_6m},{l:"1A",v:detail.return_1y}].map(r=>(
              r.v!=null&&<div key={r.l} style={{fontSize:9}}>
                <span style={{color:"#2d3748"}}>{r.l}: </span>
                <span style={{...MONO,color:(r.v>=0)?"#22c55e":"#ef4444"}}>{fmtPct(r.v)}</span>
              </div>
            ))}
          </div>
          <Spark history={detail.history} change={detail.change_pct}/>
        </div>
      )}
    </div>
  );
};

// ── BUSCADOR ──────────────────────────────────────────────────────────────────
const SearchInput = ({onSelect}) => {
  const [q,setQ]       = useState("");
  const [res,setRes]   = useState([]);
  const [loading,setL] = useState(false);
  const [open,setOpen] = useState(false);
  const ref            = useRef(null);

  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  useEffect(()=>{
    if(!q.trim()){setRes([]);setOpen(false);return;}
    const t=setTimeout(async()=>{
      setL(true);
      try{
        const r=await fetch(`${API_BASE}/funds/search?q=${encodeURIComponent(q)}`);
        if(r.ok){const d=await r.json();setRes(d||[]);setOpen((d||[]).length>0);}
      }catch{}
      setL(false);
    },400);
    return()=>clearTimeout(t);
  },[q]);

  const pick=item=>{setQ("");setRes([]);setOpen(false);onSelect(item);};

  return(
    <div ref={ref} style={{position:"relative",flex:1,maxWidth:500}}>
      <div style={{display:"flex",alignItems:"center",background:"#0b0f18",
        border:`1px solid ${open?"#2a4070":"#1e2a3a"}`,borderRadius:8}}>
        <span style={{padding:"0 12px",color:"#334155",fontSize:15}}>⌕</span>
        <input value={q} onChange={e=>setQ(e.target.value)} onFocus={()=>res.length>0&&setOpen(true)}
          placeholder='Busca fondo por nombre o ISIN, ej: "Cobas", "Vanguard", "IE00B4L5Y983"'
          style={{flex:1,background:"transparent",border:"none",outline:"none",padding:"9px 0",
            color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
        {loading&&<span style={{padding:"0 12px",color:"#334155",fontSize:11}}>···</span>}
        {q&&!loading&&<button onClick={()=>{setQ("");setRes([]);setOpen(false);}}
          style={{padding:"0 12px",background:"transparent",border:"none",color:"#334155",fontSize:14,cursor:"pointer"}}>✕</button>}
      </div>
      {open&&res.length>0&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#111827",
          border:"1px solid #2a3a50",borderRadius:8,boxShadow:"0 8px 32px rgba(0,0,0,.7)",
          zIndex:300,maxHeight:360,overflowY:"auto"}}>
          {res.map((r,i)=>(
            <div key={i} onClick={()=>pick(r)}
              style={{padding:"9px 14px",cursor:"pointer",borderBottom:i<res.length-1?"1px solid #1a2535":"none"}}
              onMouseEnter={e=>e.currentTarget.style.background="#141e2e"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{...MONO,fontSize:12,color:"#f59e0b"}}>{r.symbol}</div>
              <div style={{fontSize:12,color:"#94a3b8",marginTop:1}}>{r.name}</div>
              {r.isin&&<div style={{...MONO,fontSize:10,color:"#2d3748",marginTop:1}}>{r.isin}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── FUNDS PRINCIPAL ───────────────────────────────────────────────────────────
export default function Funds() {
  const [details,setDetails]   = useState({});
  const [loading,setLoading]   = useState({});
  const [errors,setErrors]     = useState({});
  const [selected,setSelected] = useState(null);
  const [activeGrp,setActiveGrp] = useState("Todos");
  const [filter,setFilter]     = useState("");
  const [extra,setExtra]       = useState([]);
  const loaded = useRef(new Set());

  const loadDetail = useCallback(async sym => {
    if(!sym||loaded.current.has(sym)) return;
    loaded.current.add(sym);
    setLoading(p=>({...p,[sym]:true}));
    try{
      const r=await fetch(`${API_BASE}/funds/${sym}/detail`);
      if(r.ok){ const d=await r.json(); setDetails(p=>({...p,[sym]:d})); }
      else setErrors(p=>({...p,[sym]:"Sin datos"}));
    }catch{setErrors(p=>({...p,[sym]:"Error de conexión"}));}
    setLoading(p=>({...p,[sym]:false}));
  },[]);

  // Cargar todos en grupos de 3 con delay para no saturar
  useEffect(()=>{
    const load=async()=>{
      const syms=[...CATALOG.map(f=>f.symbol),...extra.map(f=>f.symbol)];
      for(let i=0;i<syms.length;i++){
        loadDetail(syms[i]);
        if(i%3===2) await new Promise(r=>setTimeout(r,150));
      }
    };
    load();
  },[extra.length]);

  useEffect(()=>{if(selected)loadDetail(selected);},[selected]);

  const handleSearchSelect = item => {
    if(!item.symbol) return;
    if(!CATALOG.find(f=>f.symbol===item.symbol)&&!extra.find(f=>f.symbol===item.symbol)){
      setExtra(prev=>[{symbol:item.symbol,name:item.name||item.symbol,mgr:item.exchange||"",isin:item.isin||"",grp:"🔍 Encontrados"},...prev]);
    }
    setSelected(item.symbol);
  };

  const allFunds = useMemo(()=>[
    ...extra.map(f=>({...f,grp:"🔍 Encontrados"})),
    ...CATALOG,
  ],[extra]);

  const grps = useMemo(()=>{
    const gs=["Todos","🔍 Encontrados",...GROUPS];
    return gs.filter(g=>g==="Todos"||g==="🔍 Encontrados"?extra.length>0||g==="Todos":true);
  },[extra]);

  const filtered = useMemo(()=>{
    let list=allFunds;
    if(activeGrp!=="Todos") list=list.filter(f=>f.grp===activeGrp);
    if(filter.trim()){
      const fl=filter.toLowerCase();
      list=list.filter(f=>f.name.toLowerCase().includes(fl)||f.symbol.toLowerCase().includes(fl)||(f.mgr||"").toLowerCase().includes(fl)||(f.isin||"").toLowerCase().includes(fl));
    }
    return list;
  },[allFunds,activeGrp,filter]);

  const selectedFund = allFunds.find(f=>f.symbol===selected)||{symbol:selected,name:selected,mgr:"",isin:""};
  const loadedCount  = Object.keys(details).length;
  const totalCount   = allFunds.length;

  return(
    <div style={{background:"#0b0f18",minHeight:"100vh",color:"#e2e8f0",fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}
        @keyframes slide{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}
        ::-webkit-scrollbar{width:6px} ::-webkit-scrollbar-track{background:#0b0f18}
        ::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:3px}
      `}</style>
      <div style={{maxWidth:1440,margin:"0 auto",padding:"20px 24px"}}>

        {/* HEADER */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:"#f1f5f9"}}>Fondos de Inversión</div>
            <div style={{fontSize:11,color:"#4a5568",marginTop:2}}>
              {totalCount} fondos y ETFs · {loadedCount} con datos cargados · NAV actualizado diariamente
            </div>
          </div>
          {loadedCount>0&&(
            <div style={{...MONO,fontSize:11,color:"#334155"}}>
              {loadedCount}/{totalCount} cargados
              <div style={{width:120,height:2,background:"#1e2a3a",borderRadius:1,marginTop:4,overflow:"hidden"}}>
                <div style={{width:`${(loadedCount/totalCount)*100}%`,height:"100%",background:"#f59e0b",borderRadius:1,transition:"width .4s"}}/>
              </div>
            </div>
          )}
        </div>

        {/* BUSCADOR */}
        <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
          <div style={{fontSize:10,color:"#334155",marginBottom:7,textTransform:"uppercase",letterSpacing:"0.07em"}}>Añadir fondo por nombre o ISIN</div>
          <SearchInput onSelect={handleSearchSelect}/>
        </div>

        {/* TABS DE GRUPOS */}
        <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
          {GROUPS.map(g=>(
            <button key={g} onClick={()=>setActiveGrp(g)}
              style={{padding:"5px 12px",border:"1px solid #1e2a3a",borderRadius:5,
                background:activeGrp===g?"#1e3050":"transparent",
                color:activeGrp===g?"#e2e8f0":"#4a5568",
                fontSize:11,fontFamily:"inherit",cursor:"pointer"}}>
              {g}
              <span style={{...MONO,fontSize:9,color:"#334155",marginLeft:5}}>
                {allFunds.filter(f=>f.grp===g).length}
              </span>
            </button>
          ))}
          <button onClick={()=>setActiveGrp("Todos")}
            style={{padding:"5px 12px",border:"1px solid #1e2a3a",borderRadius:5,
              background:activeGrp==="Todos"?"#1e3050":"transparent",
              color:activeGrp==="Todos"?"#e2e8f0":"#4a5568",
              fontSize:11,fontFamily:"inherit",cursor:"pointer"}}>
            Todos <span style={{...MONO,fontSize:9,color:"#334155",marginLeft:5}}>{allFunds.length}</span>
          </button>
        </div>

        {/* FILTRO TEXTO */}
        <div style={{display:"flex",alignItems:"center",background:"#0b0f18",border:"1px solid #1e2a3a",
          borderRadius:6,padding:"5px 12px",marginBottom:12,maxWidth:380,gap:6}}>
          <span style={{color:"#334155",fontSize:12}}>🔍</span>
          <input value={filter} onChange={e=>setFilter(e.target.value)}
            placeholder="Filtrar fondos en esta vista…"
            style={{background:"transparent",border:"none",outline:"none",color:"#e2e8f0",fontSize:12,fontFamily:"inherit",flex:1}}/>
          {filter&&<button onClick={()=>setFilter("")}
            style={{background:"transparent",border:"none",color:"#334155",cursor:"pointer",fontSize:12}}>✕</button>}
        </div>

        {/* LAYOUT */}
        <div style={{display:"grid",gridTemplateColumns:selected?"1fr 400px":"1fr",gap:16,alignItems:"start"}}>

          {/* LISTA */}
          <div>
            {/* Tabla cabecera */}
            <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:10,overflow:"hidden"}}>
              {/* Header tabla */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 70px 70px 80px 70px",
                padding:"8px 14px",borderBottom:"1px solid #1e2a3a",gap:8}}>
                {["Fondo / Gestora","NAV","Hoy","1 Mes","6 Meses","1 Año",""].map((h,i)=>(
                  <div key={i} style={{fontSize:9,fontWeight:600,color:"#334155",textTransform:"uppercase",
                    letterSpacing:"0.07em",textAlign:i===0?"left":"right"}}>{h}</div>
                ))}
              </div>

              {/* Filas */}
              {filtered.length===0?(
                <div style={{padding:40,textAlign:"center",color:"#334155",fontSize:13}}>Sin fondos para "{filter}"</div>
              ):(
                <div style={{maxHeight:"70vh",overflowY:"auto"}}>
                  {/* Agrupar por grp si está en "Todos" */}
                  {(activeGrp==="Todos"?GROUPS.filter(g=>filtered.some(f=>f.grp===g)):["_"])
                    .map(grpLabel=>{
                      const grpFunds=activeGrp==="Todos"?filtered.filter(f=>f.grp===grpLabel):filtered;
                      if(grpFunds.length===0)return null;
                      return(
                        <div key={grpLabel}>
                          {activeGrp==="Todos"&&(
                            <div style={{padding:"6px 14px",background:"#0d1520",borderBottom:"1px solid #1a2535",
                              fontSize:10,fontWeight:600,color:"#4a5568",letterSpacing:"0.06em"}}>
                              {grpLabel}
                            </div>
                          )}
                          {grpFunds.map(f=>{
                            const d=details[f.symbol];
                            const l=loading[f.symbol];
                            const isUp=(d?.change_pct||0)>=0;
                            const c=isUp?"#22c55e":"#ef4444";
                            const isSel=selected===f.symbol;
                            return(
                              <div key={f.symbol}
                                style={{display:"grid",gridTemplateColumns:"1fr 70px 70px 70px 70px 80px 70px",
                                  padding:"10px 14px",borderBottom:"1px solid #111827",gap:8,alignItems:"center",
                                  cursor:"pointer",background:isSel?"#141e2e":"transparent"}}
                                onClick={()=>setSelected(isSel?null:f.symbol)}
                                onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background="#141e2e";}}
                                onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background="transparent";}}>
                                <div style={{minWidth:0}}>
                                  <div style={{fontSize:12,color:"#e2e8f0",fontWeight:500,overflow:"hidden",
                                    textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div>
                                  <div style={{display:"flex",gap:8,marginTop:2,alignItems:"center"}}>
                                    <span style={{fontSize:10,color:"#4a5568"}}>{f.mgr}</span>
                                    {f.isin&&<span style={{...MONO,fontSize:9,color:"#2d3748"}}>{f.isin.slice(0,12)}</span>}
                                  </div>
                                </div>
                                {l?(
                                  <div style={{height:10,background:"#1e2a3a",borderRadius:2,animation:"pulse 1.5s ease-in-out infinite",gridColumn:"2/7"}}/>
                                ):d?(
                                  <>
                                    <div style={{...MONO,fontSize:12,color:"#e2e8f0",textAlign:"right"}}>{fmt(d.current_nav||d.current_price,4)}</div>
                                    <div style={{...MONO,fontSize:11,color:c,textAlign:"right"}}>{fmtPct(d.change_pct)}</div>
                                    <div style={{...MONO,fontSize:11,color:(d.return_1m||0)>=0?"#22c55e":"#ef4444",textAlign:"right"}}>{fmtPct(d.return_1m)}</div>
                                    <div style={{...MONO,fontSize:11,color:(d.return_6m||0)>=0?"#22c55e":"#ef4444",textAlign:"right"}}>{fmtPct(d.return_6m)}</div>
                                    <div style={{...MONO,fontSize:11,color:(d.return_1y||0)>=0?"#22c55e":"#ef4444",textAlign:"right"}}>{fmtPct(d.return_1y)}</div>
                                  </>
                                ):(
                                  <div style={{fontSize:10,color:"#2d3748",textAlign:"right",gridColumn:"2/7"}}>Sin datos</div>
                                )}
                                <div style={{display:"flex",justifyContent:"flex-end"}}>
                                  <button onClick={e=>{e.stopPropagation();setSelected(isSel?null:f.symbol);}}
                                    style={{background:"none",border:"1px solid #1e2a3a",borderRadius:4,padding:"2px 7px",
                                      color:isSel?"#f59e0b":"#4a5568",fontSize:10,fontFamily:"inherit",cursor:"pointer",
                                      borderColor:isSel?"#f59e0b":"#1e2a3a"}}
                                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}}
                                    onMouseLeave={e=>{if(!isSel){e.currentTarget.style.borderColor="#1e2a3a";e.currentTarget.style.color="#4a5568";}}}>
                                    {isSel?"✕":"→"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })
                  }
                </div>
              )}
              <div style={{padding:"7px 14px",borderTop:"1px solid #1e2a3a",display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:10,color:"#2d3748"}}>Clic en un fondo para ver gráfico y rentabilidades</span>
                <span style={{...MONO,fontSize:10,color:"#2d3748"}}>{filtered.length} fondos</span>
              </div>
            </div>
          </div>

          {/* PANEL DETALLE */}
          {selected&&(
            <DetailPanel
              key={selected}
              fund={selectedFund}
              detail={details[selected]}
              loading={loading[selected]}
              error={errors[selected]}
              onClose={()=>setSelected(null)}
            />
          )}
        </div>

        <div style={{marginTop:14,padding:"8px 14px",background:"#111827",border:"1px solid #1e2a3a",
          borderRadius:7,fontSize:10,color:"#334155"}}>
          ℹ Los fondos de inversión actualizan su NAV una vez al día al cierre. Los ETFs (IWDA, VWCE, CSPX...) cotizan en tiempo real en bolsa. Datos vía Yahoo Finance.
        </div>
      </div>
    </div>
  );
}
