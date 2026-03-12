import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { API_BASE } from "./config.js";

// ── CACHÉ FRONTEND (compartida con otros módulos) ────────────────────────────
import { cacheFetch as fcFetch } from "./cache.js";


const fmt    = (n, d=2) => n!=null&&!isNaN(n)?Number(n).toFixed(d):"—";
const fmtPct = n => n!=null&&!isNaN(n)?`${n>0?"+":""}${fmt(n)}%`:"—";
const fmtBig = n => {
  if(n==null||isNaN(n))return"—";
  const a=Math.abs(n),s=n<0?"-":"";
  if(a>=1e12)return`${s}$${(a/1e12).toFixed(2)}T`;
  if(a>=1e9) return`${s}$${(a/1e9).toFixed(2)}B`;
  if(a>=1e6) return`${s}$${(a/1e6).toFixed(1)}M`;
  return`${s}$${a.toFixed(2)}`;
};
const MONO = {fontFamily:"'JetBrains Mono',monospace"};

// ── ÍNDICES REALES ────────────────────────────────────────────────────────────
const INDICES = [
  { ticker:"^GSPC",   name:"S&P 500",       region:"🇺🇸", icon:"📈" },
  { ticker:"^IXIC",   name:"NASDAQ",         region:"🇺🇸", icon:"💻" },
  { ticker:"^DJI",    name:"Dow Jones",      region:"🇺🇸", icon:"🏛️" },
  { ticker:"^RUT",    name:"Russell 2000",   region:"🇺🇸", icon:"📊" },
  { ticker:"^GDAXI",  name:"DAX",            region:"🇩🇪", icon:"🏭" },
  { ticker:"^FCHI",   name:"CAC 40",         region:"🇫🇷", icon:"🗼" },
  { ticker:"^FTSE",   name:"FTSE 100",       region:"🇬🇧", icon:"🎡" },
  { ticker:"^IBEX",   name:"IBEX 35",        region:"🇪🇸", icon:"🐂" },
  { ticker:"^N225",   name:"Nikkei 225",     region:"🇯🇵", icon:"🗻" },
  { ticker:"^HSI",    name:"Hang Seng",      region:"🇭🇰", icon:"🌃" },
  { ticker:"GC=F",    name:"Oro",            region:"🌍",  icon:"🥇" },
  { ticker:"CL=F",    name:"Petróleo WTI",   region:"🌍",  icon:"🛢️" },
  { ticker:"BTC-USD", name:"Bitcoin",        region:"₿",   icon:"🟡" },
];

// Logos via múltiples fuentes con fallback automático
const LOGO_SOURCES = {
  "AAPL":   ["https://companiesmarketcap.com/img/company-logos/64/AAPL.webp",   "https://www.apple.com/favicon.ico"],
  "MSFT":   ["https://companiesmarketcap.com/img/company-logos/64/MSFT.webp",   "https://www.microsoft.com/favicon.ico"],
  "NVDA":   ["https://companiesmarketcap.com/img/company-logos/64/NVDA.webp",   "https://www.nvidia.com/favicon.ico"],
  "GOOGL":  ["https://companiesmarketcap.com/img/company-logos/64/GOOGL.webp",  "https://www.google.com/favicon.ico"],
  "META":   ["https://companiesmarketcap.com/img/company-logos/64/META.webp",   "https://www.meta.com/favicon.ico"],
  "AMZN":   ["https://companiesmarketcap.com/img/company-logos/64/AMZN.webp",   "https://www.amazon.com/favicon.ico"],
  "TSLA":   ["https://companiesmarketcap.com/img/company-logos/64/TSLA.webp",   "https://www.tesla.com/favicon.ico"],
  "JPM":    ["https://companiesmarketcap.com/img/company-logos/64/JPM.webp",    "https://www.jpmorganchase.com/favicon.ico"],
  "LLY":    ["https://companiesmarketcap.com/img/company-logos/64/LLY.webp",    "https://www.lilly.com/favicon.ico"],
  "V":      ["https://companiesmarketcap.com/img/company-logos/64/V.webp",      "https://www.visa.com/favicon.ico"],
  "BRK-B":  ["https://companiesmarketcap.com/img/company-logos/64/BRK-B.webp",  "https://www.berkshirehathaway.com/favicon.ico"],
  "AVGO":   ["https://companiesmarketcap.com/img/company-logos/64/AVGO.webp",   "https://www.broadcom.com/favicon.ico"],
  "SAN.MC": ["https://companiesmarketcap.com/img/company-logos/64/SAN.webp",    "https://www.santander.com/favicon.ico"],
  "BBVA.MC":["https://companiesmarketcap.com/img/company-logos/64/BBVA.webp",   "https://www.bbva.com/favicon.ico"],
  "ITX.MC": ["https://companiesmarketcap.com/img/company-logos/64/ITX.webp",    "https://www.inditex.com/favicon.ico"],
  "IBE.MC": ["https://companiesmarketcap.com/img/company-logos/64/IBE.webp",    "https://www.iberdrola.com/favicon.ico"],
  "ASML":   ["https://companiesmarketcap.com/img/company-logos/64/ASML.webp",   "https://www.asml.com/favicon.ico"],
  "NVO":    ["https://companiesmarketcap.com/img/company-logos/64/NVO.webp",    "https://www.novonordisk.com/favicon.ico"],
  "SAP":    ["https://companiesmarketcap.com/img/company-logos/64/SAP.webp",    "https://www.sap.com/favicon.ico"],
  "SHEL":   ["https://companiesmarketcap.com/img/company-logos/64/SHEL.webp",   "https://www.shell.com/favicon.ico"],
};

const FEATURED = [
  { s:"AAPL",   n:"Apple"        },
  { s:"MSFT",   n:"Microsoft"    },
  { s:"NVDA",   n:"NVIDIA"       },
  { s:"GOOGL",  n:"Alphabet"     },
  { s:"META",   n:"Meta"         },
  { s:"AMZN",   n:"Amazon"       },
  { s:"TSLA",   n:"Tesla"        },
  { s:"JPM",    n:"JPMorgan"     },
  { s:"LLY",    n:"Eli Lilly"    },
  { s:"V",      n:"Visa"         },
  { s:"BRK-B",  n:"Berkshire"    },
  { s:"AVGO",   n:"Broadcom"     },
  { s:"SAN.MC", n:"Santander"    },
  { s:"BBVA.MC",n:"BBVA"         },
  { s:"ITX.MC", n:"Inditex"      },
  { s:"IBE.MC", n:"Iberdrola"    },
  { s:"ASML",   n:"ASML"         },
  { s:"NVO",    n:"Novo Nordisk" },
  { s:"SAP",    n:"SAP"          },
  { s:"SHEL",   n:"Shell"        },
];

// ── MINI GRÁFICA CON ÁREA ─────────────────────────────────────────────────────
// idKey: string único por instancia (ej: ticker) para que los gradientes SVG no colisionen
const MiniChart = ({points, color, idKey=""}) => {
  const valid = (points||[]).filter(p=>p!=null&&!isNaN(p)&&p>0);
  if(valid.length < 2) return(
    <div style={{width:110,height:38,background:"#1e2a3a",borderRadius:4,opacity:.3,borderRadius:4}}/>
  );
  const W=110,H=38,pad=3;
  const mn=Math.min(...valid),mx=Math.max(...valid),rng=mx-mn||1;
  const x=i=>(i/(valid.length-1))*W;
  const y=v=>H-pad-((v-mn)/rng)*(H-pad*2);
  const line=valid.map((v,i)=>`${i===0?"M":"L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area=`${line} L${W},${H} L0,${H} Z`;
  // ID único: combina color + idKey + primer/último valor para evitar colisiones de gradiente SVG
  const gid=`mc_${idKey}_${color.replace(/[^a-f0-9]/gi,"")}`;
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:110,height:38,display:"block",flexShrink:0}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35"/>
          <stop offset="100%" stopColor={color} stopOpacity=".03"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      <circle cx={x(valid.length-1)} cy={y(valid[valid.length-1])} r="3" fill={color}/>
    </svg>
  );
};

// ── SPARKLINE (acciones) ──────────────────────────────────────────────────────
const Spark = ({pct, seed}) => {
  const pts = useMemo(()=>{
    let s=seed||1;
    const rand=()=>{s=(s*1664525+1013904223)>>>0;return s/0xffffffff;};
    const arr=[]; let v=100;
    for(let i=0;i<24;i++){v*=1+(pct||0)/2400+(rand()-0.5)*0.005;arr.push(v);}
    return arr;
  },[seed,pct]);
  const W=60,H=24,mn=Math.min(...pts),mx=Math.max(...pts),rng=mx-mn||1;
  const x=i=>(i/(pts.length-1))*W;
  const y=v=>H-((v-mn)/rng)*(H-2)-1;
  const d=pts.map((v,i)=>`${i===0?"M":"L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const c=(pct||0)>=0?"#22c55e":"#ef4444";
  const gid=`sk${seed}`;
  const area=`${d} L${W},${H} L0,${H} Z`;
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:60,height:24}}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity=".35"/>
          <stop offset="100%" stopColor={c} stopOpacity=".02"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={d} fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
};

// ── LOGO CON FALLBACK AUTOMÁTICO ─────────────────────────────────────────────
const Logo = ({ticker, name, size=26}) => {
  const sources = LOGO_SOURCES[ticker] || [];
  const [idx, setIdx] = useState(0);
  const src = sources[idx];

  if(!src) return(
    <div style={{width:size,height:size,background:"linear-gradient(135deg,#1e2a3a,#0d1520)",
      borderRadius:6,flexShrink:0,border:"1px solid #2a3a50",
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.42,color:"#f59e0b",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>
      {(ticker||name||"?")[0].toUpperCase()}
    </div>
  );
  return(
    <img src={src} alt={name} width={size} height={size}
      onError={()=>setIdx(i=>i+1)}
      style={{borderRadius:6,objectFit:"contain",background:"#fff",padding:2,flexShrink:0,
        imageRendering:"crisp-edges"}}/>
  );
};

// ── TARJETA ÍNDICE ────────────────────────────────────────────────────────────
const IndexCard = ({idx, data, loading, chartPts}) => {
  const isUp=(data?.change_percent||0)>=0;
  const color=isUp?"#22c55e":"#ef4444";
  const fmtPrice = p => {
    if(p==null||isNaN(p))return"—";
    if(p>10000)return Number(p).toLocaleString("es-ES",{maximumFractionDigits:0});
    if(p>1000) return Number(p).toLocaleString("es-ES",{minimumFractionDigits:0,maximumFractionDigits:0});
    return Number(p).toFixed(2);
  };
  return(
    <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:12,padding:"14px 16px",
      transition:"all .2s",position:"relative",overflow:"hidden",cursor:"default"}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=`${color}45`;e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=`0 4px 20px ${color}10`;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e2a3a";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
      <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,background:color,opacity:.8}}/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
            <span style={{fontSize:14}}>{idx.icon}</span>
            <span style={{fontSize:13,fontWeight:600,color:"#e2e8f0"}}>{idx.name}</span>
          </div>
          <div style={{display:"flex",gap:6}}>
            <span style={{fontSize:11}}>{idx.region}</span>
            <span style={{...MONO,fontSize:9,color:"#2d3748",background:"#1e2a3a",padding:"1px 5px",borderRadius:3}}>{idx.ticker}</span>
          </div>
        </div>
        <MiniChart points={chartPts} color={color} idKey={idx.ticker}/>
      </div>
      {loading&&!data?(
        <div style={{height:16,background:"#1e2a3a",borderRadius:3,animation:"pulse 1.5s ease-in-out infinite"}}/>
      ):data?(
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <span style={{...MONO,fontSize:20,color:"#f1f5f9",fontWeight:700,letterSpacing:"-0.02em"}}>
            {fmtPrice(data.current_price)}
          </span>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
            <span style={{...MONO,fontSize:12,color,background:`${color}18`,padding:"2px 8px",borderRadius:4,fontWeight:600}}>
              {isUp?"▲":"▼"} {fmtPct(data.change_percent)}
            </span>
            {data.change!=null&&<span style={{...MONO,fontSize:10,color:"#334155"}}>
              {data.change>=0?"+":""}{fmt(data.change,data.current_price>100?0:2)}
            </span>}
          </div>
        </div>
      ):(
        <span style={{fontSize:11,color:"#2d3748"}}>Sin datos</span>
      )}
    </div>
  );
};

// ── GAUGE SENTIMIENTO ─────────────────────────────────────────────────────────
const SentGauge = ({value}) => {
  const v=Math.max(0,Math.min(100,value||50));
  const label=v<20?"Miedo Extremo":v<40?"Miedo":v<60?"Neutral":v<80?"Codicia":"Codicia Extrema";
  const color=v<20?"#ef4444":v<40?"#f97316":v<60?"#f59e0b":v<80?"#84cc16":"#22c55e";
  const cx=90,cy=90,r=65;
  const toRad=a=>(a*Math.PI)/180;
  const pt=a=>[cx+r*Math.cos(toRad(a)),cy+r*Math.sin(toRad(a))];
  const [sx,sy]=pt(-220); const [ex,ey]=pt(40);
  const fillAng=-220+(v/100)*260;
  const [fx,fy]=pt(fillAng);
  const la=v>50?1:0;
  const nx=cx+58*Math.cos(toRad(fillAng));
  const ny=cy+58*Math.sin(toRad(fillAng));
  return(
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"4px 0"}}>
      <svg viewBox="0 0 180 130" style={{width:180,height:130}}>
        {/* Fondo */}
        <path d={`M${sx},${sy} A${r},${r} 0 1 1 ${ex},${ey}`}
          fill="none" stroke="#1e2a3a" strokeWidth={14} strokeLinecap="round"/>
        {/* Zona de color */}
        <path d={`M${sx},${sy} A${r},${r} 0 ${la} 1 ${fx},${fy}`}
          fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 6px ${color}50)`}}/>
        {/* Aguja */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#e2e8f0" strokeWidth={3} strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r={6} fill="#e2e8f0"/>
        <circle cx={cx} cy={cy} r={3} fill="#0b0f18"/>
        {/* Valor */}
        <text x={cx} y={cy+28} textAnchor="middle" fill={color}
          fontSize={26} fontWeight="800" fontFamily="'JetBrains Mono',monospace">{v}</text>
        {/* Etiquetas */}
        <text x={22} y={115} textAnchor="middle" fill="#ef444480" fontSize={8} fontFamily="sans-serif">MIEDO</text>
        <text x={158} y={115} textAnchor="middle" fill="#22c55e80" fontSize={8} fontFamily="sans-serif">CODICIA</text>
      </svg>
      <div style={{fontSize:13,fontWeight:700,color,marginTop:-10}}>{label}</div>
      <div style={{fontSize:10,color:"#334155",marginTop:2}}>Índice de sentimiento</div>
    </div>
  );
};

// ── HOME ──────────────────────────────────────────────────────────────────────
export default function Home({onNavigate}) {
  const [indData,setIndData]   = useState({});
  const [indCharts,setCharts]  = useState({});
  const [indLoading,setIndL]   = useState(true);
  const [featPrices,setFeat]   = useState({});
  const [portfolio,setPort]    = useState([]);
  const [portPrices,setPortP]  = useState({});
  const [countdown,setCd]      = useState(30);
  const [lastUp,setLastUp]     = useState(null);
  const [fgi,setFgi]           = useState(50);
  const timerRef=useRef(null), cntRef=useRef(null);

  const loadIndices=useCallback(async()=>{
    setIndL(true);
    try{
      const tickers=INDICES.map(i=>i.ticker);
      const data=await fcFetch(`${API_BASE}/market/quotes?symbols=${tickers.join(",")}`,20000);
      if(!Array.isArray(data)){setIndL(false);return;}
      const map={};
      data.forEach(d=>{if(!d.error)map[d.symbol]=d;});
      setIndData(map);
      const loaded=data.filter(d=>!d.error&&d.change_percent!=null);
      if(loaded.length){
        const up=loaded.filter(d=>(d.change_percent||0)>=0).length;
        const ratio=(up/loaded.length)*100;
        const avgMag=loaded.reduce((a,d)=>a+Math.abs(d.change_percent||0),0)/loaded.length;
        const boost=Math.min(avgMag*4,15);
        setFgi(Math.round(Math.min(98,Math.max(2,ratio>=50?ratio+boost:ratio-boost))));
      }
    }catch{}
    setIndL(false);
  },[]);

  const loadCharts=useCallback(async()=>{
    // Carga todos los charts en paralelo con stagger mínimo
    const loadOne = async(idx) => {
      try{
        const d=await fcFetch(
          `${API_BASE}/stocks/${encodeURIComponent(idx.ticker)}/chart?range=5D`,
          120000  // TTL 2 min
        );
        const pts=(d.points||[]).map(p=>p.price).filter(p=>p!=null&&p>0);
        if(pts.length>1)setCharts(prev=>({...prev,[idx.ticker]:pts}));
      }catch{}
    };
    // Todos en paralelo — el backend los tiene en caché tras el primer loadIndices
    await Promise.all(INDICES.map(loadOne));
  },[]);

  const loadFeatured=useCallback(async()=>{
    // Todas las acciones destacadas en una sola petición
    const syms=FEATURED.map(f=>f.s).join(",");
    try{
      const data=await fcFetch(`${API_BASE}/market/quotes?symbols=${syms}`,20000);
      if(!Array.isArray(data))return;
      const map={};
      data.forEach(d=>{if(!d.error)map[d.symbol]=d;});
      setFeat(map);
    }catch{}
  },[]);

  const loadPortfolio=useCallback(async()=>{
    try{
      const saved=JSON.parse(localStorage.getItem("portfolio")||"[]");
      setPort(saved);
      if(!saved.length)return;
      const r=await fetch(`${API_BASE}/market/quotes?symbols=${saved.map(p=>p.symbol).join(",")}`);
      const data=await r.json();
      const map={};
      data.forEach(d=>{if(!d.error)map[d.symbol]=d.current_price;});
      setPortP(map);
    }catch{}
  },[]);

  const refresh=useCallback(async()=>{
    setCd(30);
    // Índices y featured en paralelo, charts después (no bloquea UI)
    await Promise.all([loadIndices(),loadFeatured(),loadPortfolio()]);
    setLastUp(new Date());
    loadCharts(); // async, no await — no bloquea el render
  },[loadIndices,loadFeatured,loadPortfolio,loadCharts]);

  useEffect(()=>{
    refresh();
    timerRef.current=setInterval(refresh,30000);
    cntRef.current=setInterval(()=>setCd(c=>c>0?c-1:30),1000);
    return()=>{clearInterval(timerRef.current);clearInterval(cntRef.current);};
  },[refresh]);

  const portCalcs=useMemo(()=>portfolio.map(p=>{
    const cur=portPrices[p.symbol]||p.avgPrice;
    const val=cur*p.shares,cost=p.avgPrice*p.shares;
    return{...p,cur,val,cost,gl:val-cost,glPct:((cur-p.avgPrice)/p.avgPrice)*100};
  }),[portfolio,portPrices]);
  const totalVal=portCalcs.reduce((a,p)=>a+p.val,0);
  const totalCost=portCalcs.reduce((a,p)=>a+p.cost,0);
  const totalGL=totalVal-totalCost;
  const totalGLPct=totalCost>0?(totalGL/totalCost)*100:0;

  const validIdx=INDICES.filter(i=>indData[i.ticker]);
  const upCount=validIdx.filter(i=>(indData[i.ticker]?.change_percent||0)>=0).length;
  const sentColor=fgi>=60?"#22c55e":fgi>=40?"#f59e0b":"#ef4444";
  const sentLabel=fgi>=60?"Alcista":fgi>=40?"Neutral":"Bajista";

  return(
    <div style={{background:"#0b0f18",minHeight:"100vh",color:"#e2e8f0",fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#0b0f18}
        ::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:#2a3a50}
      `}</style>
      <div style={{maxWidth:1500,margin:"0 auto",padding:"22px 24px"}}>

        {/* HEADER */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <h1 style={{margin:0,fontSize:22,fontWeight:700,color:"#f1f5f9"}}>Resumen del Mercado</h1>
              <span style={{fontSize:12,fontWeight:600,color:sentColor,background:`${sentColor}18`,
                border:`1px solid ${sentColor}30`,padding:"3px 12px",borderRadius:20}}>
                {sentLabel}
              </span>
            </div>
            <div style={{fontSize:11,color:"#4a5568"}}>
              {upCount}/{validIdx.length} índices en positivo
              {lastUp&&<span style={{marginLeft:8,color:"#2d3748"}}>
                · Actualizado {lastUp.toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}
              </span>}
            </div>
          </div>
          <button onClick={refresh}
            style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:7,
              padding:"8px 16px",color:"#4a5568",fontSize:12,fontFamily:"inherit",cursor:"pointer",
              display:"flex",gap:6,alignItems:"center",transition:"color .15s"}}
            onMouseEnter={e=>e.currentTarget.style.color="#e2e8f0"}
            onMouseLeave={e=>e.currentTarget.style.color="#4a5568"}>
            ↺ {countdown}s
          </button>
        </div>

        {/* ÍNDICES 4×3 */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
          {INDICES.map(idx=>(
            <IndexCard key={idx.ticker} idx={idx} data={indData[idx.ticker]}
              loading={indLoading} chartPts={indCharts[idx.ticker]}/>
          ))}
        </div>

        {/* LAYOUT PRINCIPAL */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 310px",gap:14,alignItems:"start"}}>

          {/* IZQUIERDA — TABLA ACCIONES */}
          <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:12,overflow:"hidden"}}>
            <div style={{padding:"12px 18px",borderBottom:"1px solid #1e2a3a",
              display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#4a5568",textTransform:"uppercase",letterSpacing:"0.08em"}}>
                Acciones Destacadas · {FEATURED.length} empresas
              </div>
              <button onClick={()=>onNavigate("market")}
                style={{background:"transparent",border:"1px solid #1e2a3a",borderRadius:5,
                  padding:"4px 12px",color:"#4a5568",fontSize:11,fontFamily:"inherit",cursor:"pointer",
                  transition:"color .15s"}}
                onMouseEnter={e=>e.currentTarget.style.color="#f59e0b"}
                onMouseLeave={e=>e.currentTarget.style.color="#4a5568"}>
                Ver mercado →
              </button>
            </div>

            {/* Cabecera tabla */}
            <div style={{display:"grid",gridTemplateColumns:"32px 200px 100px 100px 110px 66px 44px",
              padding:"7px 16px",borderBottom:"1px solid #1e2a3a",gap:8}}>
              {["","Empresa","Precio","Cambio","Cap. Merc.","7D",""].map((h,i)=>(
                <div key={i} style={{fontSize:9,fontWeight:700,color:"#2d3748",textTransform:"uppercase",
                  letterSpacing:"0.07em",textAlign:i===0||i===1?"left":"right"}}>{h}</div>
              ))}
            </div>

            {/* Filas */}
            <div style={{maxHeight:520,overflowY:"auto"}}>
              {FEATURED.map((f,i)=>{
                const d=featPrices[f.s];
                const isUp=(d?.change_percent||0)>=0;
                const c=isUp?"#22c55e":"#ef4444";
                const seed=f.s.charCodeAt(0)*31+(f.s.charCodeAt(1)||0)*13+(f.s.charCodeAt(2)||0)*7;
                return(
                  <div key={f.s}
                    style={{display:"grid",gridTemplateColumns:"32px 200px 100px 100px 110px 66px 44px",
                      padding:"9px 16px",borderBottom:"1px solid #111827",gap:8,alignItems:"center",cursor:"pointer"}}
                    onClick={()=>onNavigate("market",f.s)}
                    onMouseEnter={e=>e.currentTarget.style.background="#141e2e"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <Logo ticker={f.s} name={f.n} size={26}/>
                    <div style={{minWidth:0}}>
                      <div style={{...MONO,fontSize:12,color:"#f59e0b",fontWeight:700,letterSpacing:"0.02em"}}>{f.s}</div>
                      <div style={{fontSize:11,color:"#4a5568",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.n}</div>
                    </div>
                    {!d?(
                      <div style={{height:10,background:"#1e2a3a",borderRadius:2,
                        animation:"pulse 1.5s ease-in-out infinite",gridColumn:"3/7"}}/>
                    ):(
                      <>
                        <div style={{...MONO,fontSize:13,color:"#e2e8f0",textAlign:"right",fontWeight:600}}>{fmt(d.current_price)}</div>
                        <div style={{textAlign:"right"}}>
                          <span style={{...MONO,fontSize:11,color:c,background:`${c}15`,
                            padding:"2px 7px",borderRadius:3,fontWeight:600}}>
                            {isUp?"▲":"▼"} {fmtPct(d.change_percent)}
                          </span>
                        </div>
                        <div style={{...MONO,fontSize:11,color:"#4a5568",textAlign:"right"}}>{fmtBig(d.market_cap)}</div>
                        <div style={{display:"flex",justifyContent:"center"}}>
                          <Spark pct={d.change_percent} seed={seed}/>
                        </div>
                      </>
                    )}
                    <div style={{display:"flex",justifyContent:"flex-end"}}>
                      <button onClick={e=>{e.stopPropagation();onNavigate("market",f.s);}}
                        style={{background:"none",border:"1px solid #1e2a3a",borderRadius:4,
                          padding:"2px 7px",color:"#4a5568",fontSize:10,fontFamily:"inherit",cursor:"pointer"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e2a3a";e.currentTarget.style.color="#4a5568";}}>
                        →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{padding:"8px 16px",borderTop:"1px solid #1e2a3a"}}>
              <span style={{fontSize:10,color:"#2d3748"}}>Clic en cualquier empresa para ver su ficha completa</span>
            </div>
          </div>

          {/* DERECHA */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* SENTIMIENTO */}
            <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:12,padding:"16px"}}>
              <div style={{fontSize:10,fontWeight:700,color:"#334155",textTransform:"uppercase",
                letterSpacing:"0.08em",marginBottom:12,textAlign:"center"}}>Sentimiento del Mercado</div>
              <SentGauge value={fgi}/>
              <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:5}}>
                {[
                  {l:"Índices en verde",   v:`${upCount} / ${validIdx.length}`,             c:"#22c55e"},
                  {l:"Mejor hoy",
                   v:([...validIdx].sort((a,b)=>(indData[b.ticker]?.change_percent||0)-(indData[a.ticker]?.change_percent||0))[0]?.name||"—")
                    + " " + fmtPct(indData[[...validIdx].sort((a,b)=>(indData[b.ticker]?.change_percent||0)-(indData[a.ticker]?.change_percent||0))[0]?.ticker]?.change_percent),
                   c:"#22c55e"},
                  {l:"Peor hoy",
                   v:([...validIdx].sort((a,b)=>(indData[a.ticker]?.change_percent||0)-(indData[b.ticker]?.change_percent||0))[0]?.name||"—")
                    + " " + fmtPct(indData[[...validIdx].sort((a,b)=>(indData[a.ticker]?.change_percent||0)-(indData[b.ticker]?.change_percent||0))[0]?.ticker]?.change_percent),
                   c:"#ef4444"},
                ].map((s,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"6px 10px",background:"#0b0f18",border:"1px solid #1a2535",borderRadius:6}}>
                    <span style={{fontSize:10,color:"#4a5568"}}>{s.l}</span>
                    <span style={{...MONO,fontSize:10,color:s.c,textAlign:"right",maxWidth:140,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PORTFOLIO */}
            <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"11px 16px",borderBottom:"1px solid #1e2a3a",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#334155",textTransform:"uppercase",letterSpacing:"0.08em"}}>Mi Portfolio</div>
                <button onClick={()=>onNavigate("portfolio")}
                  style={{background:"none",border:"1px solid #1e2a3a",borderRadius:5,padding:"3px 10px",
                    color:"#4a5568",fontSize:11,fontFamily:"inherit",cursor:"pointer",transition:"color .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.color="#f59e0b"}
                  onMouseLeave={e=>e.currentTarget.style.color="#4a5568"}>
                  Ver todo →
                </button>
              </div>
              {portfolio.length===0?(
                <div style={{padding:"24px 16px",textAlign:"center"}}>
                  <div style={{fontSize:11,color:"#4a5568",marginBottom:12}}>Sin posiciones registradas</div>
                  <button onClick={()=>onNavigate("portfolio")}
                    style={{background:"#f59e0b",border:"none",borderRadius:6,padding:"8px 18px",
                      color:"#000",fontSize:12,fontWeight:700,fontFamily:"inherit",cursor:"pointer"}}>
                    + Añadir posición
                  </button>
                </div>
              ):(
                <>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,padding:"10px 12px",borderBottom:"1px solid #1e2a3a"}}>
                    {[
                      {l:"Valor total",v:fmtBig(totalVal),   c:"#f1f5f9"},
                      {l:"Invertido",  v:fmtBig(totalCost),  c:"#94a3b8"},
                      {l:"G/P",        v:fmtBig(totalGL),    c:totalGL>=0?"#22c55e":"#ef4444"},
                      {l:"Rentab.",    v:fmtPct(totalGLPct), c:totalGLPct>=0?"#22c55e":"#ef4444"},
                    ].map((s,i)=>(
                      <div key={i} style={{background:"#0b0f18",border:"1px solid #151e2d",borderRadius:6,padding:"8px 10px"}}>
                        <div style={{fontSize:9,color:"#2d3748",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.l}</div>
                        <div style={{...MONO,fontSize:14,color:s.c}}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {portCalcs.sort((a,b)=>b.val-a.val).slice(0,4).map((p,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                      padding:"8px 12px",borderBottom:"1px solid #111827",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#141e2e"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div>
                        <div style={{...MONO,fontSize:12,color:"#f59e0b",fontWeight:600}}>{p.symbol}</div>
                        <div style={{fontSize:10,color:"#334155"}}>{fmt(p.shares,0)} acc.</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{...MONO,fontSize:12,color:"#e2e8f0"}}>{fmtBig(p.val)}</div>
                        <div style={{...MONO,fontSize:10,color:p.gl>=0?"#22c55e":"#ef4444"}}>{fmtPct(p.glPct)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* ACCESOS RÁPIDOS */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {[
                {icon:"📊",label:"Mercado",  desc:"170+ empresas",  action:"market",   color:"#3b82f6"},
                {icon:"🔍",label:"Análisis", desc:"Ficha completa", action:"dashboard", color:"#a855f7"},
                {icon:"📦",label:"Fondos",   desc:"ETFs & Fondos",  action:"funds",     color:"#f59e0b"},
                {icon:"💱",label:"Divisas",  desc:"Conversor FX",   action:"currency",  color:"#22c55e"},
              ].map((a,i)=>(
                <button key={i} onClick={()=>onNavigate(a.action)}
                  style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:10,padding:"12px",
                    textAlign:"left",fontFamily:"inherit",cursor:"pointer",transition:"all .2s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=`${a.color}55`;e.currentTarget.style.background="#141e2e";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e2a3a";e.currentTarget.style.background="#111827";}}>
                  <div style={{fontSize:18,marginBottom:5}}>{a.icon}</div>
                  <div style={{fontSize:12,fontWeight:600,color:"#e2e8f0"}}>{a.label}</div>
                  <div style={{fontSize:10,color:"#4a5568",marginTop:1}}>{a.desc}</div>
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
