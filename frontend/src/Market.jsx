import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import StockDetail from "./StockDetail.jsx";
import { API_BASE } from "./config.js";

// ── CACHÉ FRONTEND (compartida con otros módulos) ────────────────────────────
import { cacheFetch as fcFetch } from "./cache.js";


const fmt    = (n,d=2) => n!=null&&!isNaN(n)?Number(n).toFixed(d):"—";
const fmtPct = n => n!=null&&!isNaN(n)?`${n>0?"+":""}${fmt(n)}%`:"—";
const fmtCap = n => {
  if(!n||isNaN(n))return"—";
  if(n>=1e12)return`${(n/1e12).toFixed(2)}T`;
  if(n>=1e9) return`${(n/1e9).toFixed(2)}B`;
  if(n>=1e6) return`${(n/1e6).toFixed(1)}M`;
  return`${n.toFixed(0)}`;
};
const fmtVol = n => {
  if(!n||isNaN(n))return"—";
  if(n>=1e9)return`${(n/1e9).toFixed(1)}B`;
  if(n>=1e6)return`${(n/1e6).toFixed(1)}M`;
  if(n>=1e3)return`${(n/1e3).toFixed(0)}K`;
  return`${n}`;
};
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


// ─────────────────────────────────────────────────────────────────────────────
// DATOS: 150+ acciones organizadas por mercado
// ─────────────────────────────────────────────────────────────────────────────

const IBEX35 = [
  {s:"SAN.MC",  n:"Banco Santander",      sec:"Bancos"},
  {s:"BBVA.MC", n:"BBVA",                 sec:"Bancos"},
  {s:"ITX.MC",  n:"Inditex",              sec:"Consumo"},
  {s:"IBE.MC",  n:"Iberdrola",            sec:"Energía"},
  {s:"REP.MC",  n:"Repsol",               sec:"Energía"},
  {s:"TEF.MC",  n:"Telefónica",           sec:"Telecom"},
  {s:"CABK.MC", n:"CaixaBank",            sec:"Bancos"},
  {s:"AMS.MC",  n:"Amadeus IT",           sec:"Tecnología"},
  {s:"FER.MC",  n:"Ferrovial",            sec:"Infraestructura"},
  {s:"ACS.MC",  n:"ACS",                  sec:"Construcción"},
  {s:"GRF.MC",  n:"Grifols",              sec:"Salud"},
  {s:"IAG.MC",  n:"IAG (Iberia+BA)",      sec:"Aerolíneas"},
  {s:"ACX.MC",  n:"Acerinox",             sec:"Materiales"},
  {s:"NTGY.MC", n:"Naturgy",              sec:"Energía"},
  {s:"CLNX.MC", n:"Cellnex Telecom",      sec:"Telecom"},
  {s:"MEL.MC",  n:"Meliá Hotels",         sec:"Hoteles"},
  {s:"MAP.MC",  n:"MAPFRE",               sec:"Seguros"},
  {s:"BKT.MC",  n:"Bankinter",            sec:"Bancos"},
  {s:"AENA.MC", n:"AENA",                 sec:"Aeropuertos"},
  {s:"ELE.MC",  n:"Endesa",               sec:"Energía"},
  {s:"COL.MC",  n:"Colonial",             sec:"Inmobiliario"},
  {s:"ENG.MC",  n:"Enagás",               sec:"Energía"},
  {s:"MRL.MC",  n:"Merlin Properties",    sec:"Inmobiliario"},
  {s:"VIS.MC",  n:"Viscofan",             sec:"Alimentación"},
  {s:"SAB.MC",  n:"Banco Sabadell",       sec:"Bancos"},
  {s:"MTS.MC",  n:"ArcelorMittal",        sec:"Materiales"},
  {s:"PHM.MC",  n:"Pharma Mar",           sec:"Salud"},
  {s:"LOG.MC",  n:"Logista",              sec:"Distribución"},
  {s:"ROVI.MC", n:"Laboratorios Rovi",    sec:"Salud"},
  {s:"SLR.MC",  n:"Solaria",              sec:"Energías Renovables"},
  {s:"ENCE.MC", n:"Ence",                 sec:"Materiales"},
  {s:"PRIM.MC", n:"Prim",                 sec:"Salud"},
  {s:"SGRE.MC", n:"Siemens Gamesa",       sec:"Energías Renovables"},
  {s:"UNI.MC",  n:"Unicaja Banco",        sec:"Bancos"},
  {s:"INDI.MC", n:"Indra Sistemas",       sec:"Tecnología"},
];

const USA_TECH = [
  {s:"AAPL",  n:"Apple",              sec:"Hardware"},
  {s:"MSFT",  n:"Microsoft",          sec:"Software"},
  {s:"NVDA",  n:"NVIDIA",             sec:"Semiconductores"},
  {s:"GOOGL", n:"Alphabet (Google)",  sec:"Internet"},
  {s:"META",  n:"Meta Platforms",     sec:"Redes Sociales"},
  {s:"AMZN",  n:"Amazon",             sec:"eCommerce/Cloud"},
  {s:"TSLA",  n:"Tesla",              sec:"Vehículos Eléctricos"},
  {s:"AVGO",  n:"Broadcom",           sec:"Semiconductores"},
  {s:"ORCL",  n:"Oracle",             sec:"Software"},
  {s:"CRM",   n:"Salesforce",         sec:"SaaS"},
  {s:"AMD",   n:"AMD",                sec:"Semiconductores"},
  {s:"INTC",  n:"Intel",              sec:"Semiconductores"},
  {s:"NOW",   n:"ServiceNow",         sec:"SaaS"},
  {s:"ADBE",  n:"Adobe",              sec:"Software"},
  {s:"PLTR",  n:"Palantir",           sec:"IA / Datos"},
  {s:"NET",   n:"Cloudflare",         sec:"Ciberseguridad"},
  {s:"SNOW",  n:"Snowflake",          sec:"Cloud / Datos"},
  {s:"CRWD",  n:"CrowdStrike",        sec:"Ciberseguridad"},
  {s:"PANW",  n:"Palo Alto Networks", sec:"Ciberseguridad"},
  {s:"UBER",  n:"Uber",               sec:"Movilidad"},
  {s:"ABNB",  n:"Airbnb",             sec:"Turismo / Tech"},
  {s:"SHOP",  n:"Shopify",            sec:"eCommerce"},
  {s:"COIN",  n:"Coinbase",           sec:"Crypto"},
  {s:"RBLX",  n:"Roblox",             sec:"Gaming"},
  {s:"SPOT",  n:"Spotify",            sec:"Streaming"},
  {s:"NFLX",  n:"Netflix",            sec:"Streaming"},
  {s:"DIS",   n:"Walt Disney",        sec:"Entretenimiento"},
  {s:"QCOM",  n:"Qualcomm",           sec:"Semiconductores"},
  {s:"TXN",   n:"Texas Instruments",  sec:"Semiconductores"},
  {s:"AMAT",  n:"Applied Materials",  sec:"Semiconductores"},
];

const USA_FINANCE = [
  {s:"JPM",   n:"JPMorgan Chase",     sec:"Banca"},
  {s:"V",     n:"Visa",               sec:"Pagos"},
  {s:"MA",    n:"Mastercard",         sec:"Pagos"},
  {s:"BAC",   n:"Bank of America",    sec:"Banca"},
  {s:"GS",    n:"Goldman Sachs",      sec:"Banca de Inversión"},
  {s:"MS",    n:"Morgan Stanley",     sec:"Banca de Inversión"},
  {s:"WFC",   n:"Wells Fargo",        sec:"Banca"},
  {s:"BRK-B", n:"Berkshire Hathaway", sec:"Holding"},
  {s:"BLK",   n:"BlackRock",          sec:"Gestión de Activos"},
  {s:"SCHW",  n:"Charles Schwab",     sec:"Brokerage"},
  {s:"AXP",   n:"American Express",   sec:"Pagos"},
  {s:"PYPL",  n:"PayPal",             sec:"Pagos Digitales"},
  {s:"C",     n:"Citigroup",          sec:"Banca"},
  {s:"USB",   n:"U.S. Bancorp",       sec:"Banca"},
  {s:"PGR",   n:"Progressive Corp",   sec:"Seguros"},
  {s:"CB",    n:"Chubb",              sec:"Seguros"},
  {s:"MET",   n:"MetLife",            sec:"Seguros"},
  {s:"CME",   n:"CME Group",          sec:"Bolsas"},
  {s:"ICE",   n:"Intercontinental Exchange",sec:"Bolsas"},
];

const USA_HEALTH = [
  {s:"LLY",   n:"Eli Lilly",           sec:"Farmacéuticas"},
  {s:"UNH",   n:"UnitedHealth",        sec:"Seguros Médicos"},
  {s:"JNJ",   n:"Johnson & Johnson",   sec:"Farmacéuticas"},
  {s:"ABBV",  n:"AbbVie",              sec:"Farmacéuticas"},
  {s:"MRK",   n:"Merck",               sec:"Farmacéuticas"},
  {s:"PFE",   n:"Pfizer",              sec:"Farmacéuticas"},
  {s:"TMO",   n:"Thermo Fisher",       sec:"Equipos Médicos"},
  {s:"ABT",   n:"Abbott Laboratories", sec:"Dispositivos Médicos"},
  {s:"MDT",   n:"Medtronic",           sec:"Dispositivos Médicos"},
  {s:"BMY",   n:"Bristol-Myers Squibb",sec:"Farmacéuticas"},
  {s:"GILD",  n:"Gilead Sciences",     sec:"Biotecnología"},
  {s:"AMGN",  n:"Amgen",               sec:"Biotecnología"},
  {s:"ISRG",  n:"Intuitive Surgical",  sec:"Robótica Médica"},
  {s:"CVS",   n:"CVS Health",          sec:"Farmacias"},
  {s:"CI",    n:"Cigna",               sec:"Seguros Médicos"},
];

const USA_CONSUMER = [
  {s:"AMZN",  n:"Amazon",              sec:"eCommerce"},
  {s:"WMT",   n:"Walmart",             sec:"Retail"},
  {s:"COST",  n:"Costco",              sec:"Retail"},
  {s:"HD",    n:"Home Depot",          sec:"Bricolaje"},
  {s:"MCD",   n:"McDonald's",          sec:"Restauración"},
  {s:"SBUX",  n:"Starbucks",           sec:"Restauración"},
  {s:"NKE",   n:"Nike",                sec:"Deporte"},
  {s:"TGT",   n:"Target",              sec:"Retail"},
  {s:"LOW",   n:"Lowe's",              sec:"Bricolaje"},
  {s:"TJX",   n:"TJX Companies",       sec:"Retail"},
  {s:"PG",    n:"Procter & Gamble",    sec:"Consumo Básico"},
  {s:"KO",    n:"Coca-Cola",           sec:"Bebidas"},
  {s:"PEP",   n:"PepsiCo",             sec:"Bebidas"},
  {s:"PM",    n:"Philip Morris",       sec:"Tabaco"},
  {s:"MO",    n:"Altria",              sec:"Tabaco"},
  {s:"CL",    n:"Colgate-Palmolive",   sec:"Higiene"},
  {s:"MDLZ",  n:"Mondelez",            sec:"Alimentación"},
  {s:"GIS",   n:"General Mills",       sec:"Alimentación"},
];

const USA_ENERGY_IND = [
  {s:"XOM",   n:"ExxonMobil",          sec:"Petróleo"},
  {s:"CVX",   n:"Chevron",             sec:"Petróleo"},
  {s:"COP",   n:"ConocoPhillips",      sec:"Petróleo"},
  {s:"EOG",   n:"EOG Resources",       sec:"Petróleo"},
  {s:"SLB",   n:"SLB (Schlumberger)",  sec:"Servicios Petrolíferos"},
  {s:"NEE",   n:"NextEra Energy",      sec:"Renovables"},
  {s:"DUK",   n:"Duke Energy",         sec:"Utilities"},
  {s:"SO",    n:"Southern Company",    sec:"Utilities"},
  {s:"D",     n:"Dominion Energy",     sec:"Utilities"},
  {s:"CAT",   n:"Caterpillar",         sec:"Maquinaria"},
  {s:"DE",    n:"Deere & Company",     sec:"Agrícola"},
  {s:"HON",   n:"Honeywell",           sec:"Conglomerado"},
  {s:"GE",    n:"GE Aerospace",        sec:"Aeroespacial"},
  {s:"RTX",   n:"RTX (Raytheon)",      sec:"Defensa"},
  {s:"BA",    n:"Boeing",              sec:"Aviación"},
  {s:"LMT",   n:"Lockheed Martin",     sec:"Defensa"},
  {s:"UPS",   n:"UPS",                 sec:"Logística"},
  {s:"FDX",   n:"FedEx",               sec:"Logística"},
];

const EUROPA = [
  {s:"ASML",      n:"ASML",                  sec:"Semiconductores",  pais:"🇳🇱"},
  {s:"NVO",       n:"Novo Nordisk",           sec:"Farmacéuticas",    pais:"🇩🇰"},
  {s:"LVMH",      n:"LVMH",                  sec:"Lujo",             pais:"🇫🇷"},
  {s:"SAP",       n:"SAP",                   sec:"Software",         pais:"🇩🇪"},
  {s:"SHEL",      n:"Shell",                 sec:"Petróleo",         pais:"🇬🇧"},
  {s:"AZN",       n:"AstraZeneca",            sec:"Farmacéuticas",    pais:"🇬🇧"},
  {s:"HSBC",      n:"HSBC",                  sec:"Banca",            pais:"🇬🇧"},
  {s:"UL",        n:"Unilever",              sec:"Consumo Básico",   pais:"🇬🇧"},
  {s:"BP",        n:"BP",                    sec:"Petróleo",         pais:"🇬🇧"},
  {s:"GSK",       n:"GSK",                   sec:"Farmacéuticas",    pais:"🇬🇧"},
  {s:"TTE",       n:"TotalEnergies",         sec:"Energía",          pais:"🇫🇷"},
  {s:"OR",        n:"L'Oréal",               sec:"Cosmética",        pais:"🇫🇷"},
  {s:"BNP.PA",    n:"BNP Paribas",           sec:"Banca",            pais:"🇫🇷"},
  {s:"SIE.DE",    n:"Siemens AG",            sec:"Industria",        pais:"🇩🇪"},
  {s:"ALV.DE",    n:"Allianz SE",            sec:"Seguros",          pais:"🇩🇪"},
  {s:"BAYN.DE",   n:"Bayer AG",              sec:"Farmacéuticas",    pais:"🇩🇪"},
  {s:"BMW.DE",    n:"BMW",                   sec:"Automoción",       pais:"🇩🇪"},
  {s:"VOW3.DE",   n:"Volkswagen",            sec:"Automoción",       pais:"🇩🇪"},
  {s:"ADS.DE",    n:"Adidas",                sec:"Deporte",          pais:"🇩🇪"},
  {s:"NESN.SW",   n:"Nestlé",               sec:"Alimentación",     pais:"🇨🇭"},
  {s:"ROG.SW",    n:"Roche",                 sec:"Farmacéuticas",    pais:"🇨🇭"},
  {s:"NOVN.SW",   n:"Novartis",              sec:"Farmacéuticas",    pais:"🇨🇭"},
  {s:"UBSG.SW",   n:"UBS Group",             sec:"Banca",            pais:"🇨🇭"},
  {s:"ENEL.MI",   n:"Enel SpA",              sec:"Energía",          pais:"🇮🇹"},
  {s:"ENI.MI",    n:"Eni SpA",               sec:"Petróleo",         pais:"🇮🇹"},
  {s:"ISP.MI",    n:"Intesa Sanpaolo",        sec:"Banca",            pais:"🇮🇹"},
  {s:"UCG.MI",    n:"UniCredit",             sec:"Banca",            pais:"🇮🇹"},
];

const ASIA = [
  {s:"TSM",       n:"TSMC",                  sec:"Semiconductores",  pais:"🇹🇼"},
  {s:"BABA",      n:"Alibaba",               sec:"eCommerce",        pais:"🇨🇳"},
  {s:"TCEHY",     n:"Tencent",               sec:"Internet",         pais:"🇨🇳"},
  {s:"JD",        n:"JD.com",                sec:"eCommerce",        pais:"🇨🇳"},
  {s:"BIDU",      n:"Baidu",                 sec:"Internet / IA",    pais:"🇨🇳"},
  {s:"NIO",       n:"NIO",                   sec:"Vehículos Eléctricos",pais:"🇨🇳"},
  {s:"7203.T",    n:"Toyota Motor",          sec:"Automoción",       pais:"🇯🇵"},
  {s:"6758.T",    n:"Sony Group",            sec:"Electrónica",      pais:"🇯🇵"},
  {s:"9984.T",    n:"SoftBank Group",        sec:"Inversión / Tech",  pais:"🇯🇵"},
  {s:"6861.T",    n:"Keyence",               sec:"Automatización",   pais:"🇯🇵"},
  {s:"005930.KS", n:"Samsung Electronics",   sec:"Electrónica",      pais:"🇰🇷"},
  {s:"000660.KS", n:"SK Hynix",              sec:"Semiconductores",  pais:"🇰🇷"},
  {s:"RELIANCE.NS",n:"Reliance Industries",  sec:"Conglomerado",     pais:"🇮🇳"},
  {s:"TCS.NS",    n:"Tata Consultancy",      sec:"IT Services",      pais:"🇮🇳"},
  {s:"INFY",      n:"Infosys",               sec:"IT Services",      pais:"🇮🇳"},
];

const ETFS = [
  {s:"SPY",       n:"SPDR S&P 500 ETF",               sec:"RV USA"},
  {s:"QQQ",       n:"Invesco NASDAQ 100 ETF",          sec:"RV USA Tech"},
  {s:"IWM",       n:"iShares Russell 2000 ETF",        sec:"RV USA Small Cap"},
  {s:"VTI",       n:"Vanguard Total Stock Market ETF", sec:"RV USA Total"},
  {s:"DIA",       n:"SPDR Dow Jones Industrial ETF",   sec:"RV USA"},
  {s:"IWDA.AS",   n:"iShares MSCI World UCITS ETF",    sec:"RV Global"},
  {s:"VWCE.DE",   n:"Vanguard FTSE All-World UCITS",   sec:"RV Global"},
  {s:"CSPX.L",    n:"iShares Core S&P 500 UCITS",      sec:"RV USA"},
  {s:"VUSA.L",    n:"Vanguard S&P 500 UCITS ETF",      sec:"RV USA"},
  {s:"EQQQ.L",    n:"Invesco NASDAQ-100 UCITS ETF",    sec:"RV USA Tech"},
  {s:"EWJ",       n:"iShares MSCI Japan ETF",          sec:"RV Japón"},
  {s:"EWG",       n:"iShares MSCI Germany ETF",        sec:"RV Alemania"},
  {s:"EWQ",       n:"iShares MSCI France ETF",         sec:"RV Francia"},
  {s:"FXI",       n:"iShares China Large-Cap ETF",     sec:"RV China"},
  {s:"EEM",       n:"iShares MSCI Emerging Markets",   sec:"RV Emergentes"},
  {s:"VWO",       n:"Vanguard Emerging Markets ETF",   sec:"RV Emergentes"},
  {s:"GLD",       n:"SPDR Gold Shares ETF",            sec:"Materias Primas"},
  {s:"SLV",       n:"iShares Silver Trust",            sec:"Materias Primas"},
  {s:"USO",       n:"United States Oil Fund",          sec:"Materias Primas"},
  {s:"TLT",       n:"iShares 20+ Year Treasury ETF",   sec:"RF USA LP"},
  {s:"AGG",       n:"iShares Core U.S. Aggregate Bond",sec:"RF USA"},
  {s:"BND",       n:"Vanguard Total Bond Market ETF",  sec:"RF USA"},
  {s:"AGGH.L",    n:"iShares Core Global Agg Bond",    sec:"RF Global"},
  {s:"ARKK",      n:"ARK Innovation ETF",              sec:"Innovación"},
  {s:"XLK",       n:"Technology Select Sector SPDR",   sec:"RV Tech USA"},
  {s:"XLF",       n:"Financial Select Sector SPDR",    sec:"RV Finanzas USA"},
  {s:"XLE",       n:"Energy Select Sector SPDR",       sec:"RV Energía USA"},
  {s:"XLV",       n:"Health Care Select Sector SPDR",  sec:"RV Salud USA"},
];

// Mapa de mercados — cada tab tiene su lista y etiqueta
const MARKETS = [
  {id:"ibex35",     label:"🇪🇸 IBEX 35",      data:IBEX35,        endpoint:"ibex35"},
  {id:"usa_tech",   label:"🇺🇸 USA Tecnología",data:USA_TECH,      endpoint:"quotes"},
  {id:"usa_fin",    label:"🇺🇸 USA Finanzas",  data:USA_FINANCE,   endpoint:"quotes"},
  {id:"usa_health", label:"🇺🇸 USA Salud",     data:USA_HEALTH,    endpoint:"quotes"},
  {id:"usa_cons",   label:"🇺🇸 USA Consumo",   data:USA_CONSUMER,  endpoint:"quotes"},
  {id:"usa_ind",    label:"🇺🇸 USA Energía/Ind",data:USA_ENERGY_IND,endpoint:"quotes"},
  {id:"europa",     label:"🌍 Europa",          data:EUROPA,        endpoint:"quotes"},
  {id:"asia",       label:"🌏 Asia",            data:ASIA,          endpoint:"quotes"},
  {id:"etfs",       label:"📦 ETFs",            data:ETFS,          endpoint:"quotes"},
];

// ── SPARKLINE ─────────────────────────────────────────────────────────────────
const Spark = ({pct, seed}) => {
  const pts = useMemo(()=>{
    let s = seed||1;
    const rand = ()=>{s=(s*1664525+1013904223)>>>0; return s/0xffffffff;};
    const trend = (pct||0)/20;
    const arr=[]; let v=100;
    for(let i=0;i<20;i++){v*=1+trend/100+(rand()-0.5)*0.006; arr.push(v);}
    return arr;
  },[seed,pct]);
  const W=64,H=24,min=Math.min(...pts),max=Math.max(...pts),rng=max-min||1;
  const x=i=>(i/(pts.length-1))*W;
  const y=v=>H-((v-min)/rng)*(H-2)-1;
  const d=pts.map((v,i)=>`${i===0?"M":"L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const color=(pct||0)>=0?"#22c55e":"#ef4444";
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:64,height:24}}>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
};

// ── BUSCADOR UNIVERSAL ────────────────────────────────────────────────────────
const SearchBar = ({onSelect}) => {
  const [q,setQ]         = useState("");
  const [res,setRes]     = useState([]);
  const [loading,setL]   = useState(false);
  const [open,setOpen]   = useState(false);
  const ref              = useRef(null);

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
        const r=await fetch(`${API_BASE}/search?q=${encodeURIComponent(q)}&limit=20`);
        if(r.ok){const d=await r.json();setRes(d.results||[]);setOpen((d.results||[]).length>0);}
      }catch{}
      setL(false);
    },300);
    return()=>clearTimeout(t);
  },[q]);

  const pick=item=>{setQ("");setRes([]);setOpen(false);onSelect(item);};
  const tColor=t=>{
    const u=(t||"").toUpperCase();
    if(u==="ETF")return"#3b82f6";
    if(u.includes("FUND"))return"#f59e0b";
    return"#22c55e";
  };

  return(
    <div ref={ref} style={{position:"relative",flex:1,maxWidth:560}}>
      <div style={{display:"flex",alignItems:"center",background:"#0b0f18",border:`1px solid ${open?"#2a4070":"#1e2a3a"}`,borderRadius:8}}>
        <span style={{padding:"0 12px",color:"#334155",fontSize:15}}>⌕</span>
        <input value={q} onChange={e=>setQ(e.target.value)} onFocus={()=>res.length>0&&setOpen(true)}
          placeholder="Busca cualquier acción por nombre, ticker o ISIN…"
          style={{flex:1,background:"transparent",border:"none",outline:"none",padding:"9px 0",color:"#e2e8f0",fontSize:13,fontFamily:"inherit"}}/>
        {loading&&<span style={{padding:"0 12px",color:"#334155",fontSize:11}}>···</span>}
        {q&&!loading&&<button onClick={()=>{setQ("");setRes([]);setOpen(false);}}
          style={{padding:"0 12px",background:"transparent",border:"none",color:"#334155",fontSize:14,cursor:"pointer"}}>✕</button>}
      </div>
      {open&&res.length>0&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#111827",
          border:"1px solid #2a3a50",borderRadius:8,boxShadow:"0 8px 32px rgba(0,0,0,.7)",zIndex:300,maxHeight:380,overflowY:"auto"}}>
          {res.map((r,i)=>(
            <div key={i} onClick={()=>pick(r)}
              style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 14px",
                cursor:"pointer",borderBottom:i<res.length-1?"1px solid #1a2535":"none"}}
              onMouseEnter={e=>e.currentTarget.style.background="#141e2e"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:1}}>
                  <span style={{...MONO,fontSize:13,color:"#f59e0b",fontWeight:600}}>{r.symbol}</span>
                  {r.exchange&&<span style={{fontSize:10,color:"#334155"}}>{r.exchange}</span>}
                </div>
                <div style={{fontSize:12,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
              </div>
              {r.type&&<span style={{...MONO,fontSize:10,color:tColor(r.type),background:`${tColor(r.type)}18`,
                padding:"2px 7px",borderRadius:3,marginLeft:8,textTransform:"uppercase"}}>{r.type}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── TABLA DE ACCIONES ─────────────────────────────────────────────────────────
const StockTable = ({rows, prices, onAnalyze, loading, showPais=false}) => {
  const [sortK,setSortK] = useState("cap");
  const [sortD,setSortD] = useState("desc");
  const [filter,setFilter] = useState("");

  const toggle=k=>{
    if(sortK===k)setSortD(d=>d==="asc"?"desc":"asc");
    else{setSortK(k);setSortD("desc");}
  };

  const enriched = useMemo(()=>{
    let list = rows.map(r=>{
      const p = prices[r.s]||{};
      return {...r, price:p.current_price, chg:p.change_percent, vol:p.volume, cap:p.market_cap,
              name2:p.name||r.n, loaded:!!p.current_price};
    });
    if(filter.trim()){
      const fl=filter.toLowerCase();
      list=list.filter(r=>r.s.toLowerCase().includes(fl)||r.n.toLowerCase().includes(fl)||(r.sec||"").toLowerCase().includes(fl));
    }
    list.sort((a,b)=>{
      if(sortK==="s")   return sortD==="asc"?a.s.localeCompare(b.s):b.s.localeCompare(a.s);
      if(sortK==="n")   return sortD==="asc"?a.n.localeCompare(b.n):b.n.localeCompare(a.n);
      const av=a[sortK],bv=b[sortK];
      if(av==null)return 1; if(bv==null)return-1;
      return sortD==="asc"?av-bv:bv-av;
    });
    return list;
  },[rows,prices,sortK,sortD,filter]);

  const loaded  = enriched.filter(r=>r.loaded);
  const upCount = loaded.filter(r=>(r.chg||0)>=0).length;
  const dnCount = loaded.filter(r=>(r.chg||0)<0).length;

  const Th=({label,k,left})=>(
    <div onClick={()=>toggle(k)} style={{fontSize:9,fontWeight:600,color:"#334155",textTransform:"uppercase",
      letterSpacing:"0.08em",cursor:"pointer",textAlign:left?"left":"right",display:"flex",
      alignItems:"center",justifyContent:left?"flex-start":"flex-end",gap:3,userSelect:"none"}}
      onMouseEnter={e=>e.currentTarget.style.color="#94a3b8"}
      onMouseLeave={e=>e.currentTarget.style.color="#334155"}>
      {label}{sortK===k&&<span style={{fontSize:8}}>{sortD==="asc"?"↑":"↓"}</span>}
    </div>
  );

  const COLS = showPais
    ? "36px 30px 80px 1fr 80px 90px 90px 100px 70px 70px 60px"
    : "36px 30px 90px 1fr 100px 90px 90px 100px 70px 70px 60px";

  return(
    <div>
      {/* Mini stats + filtro */}
      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <span style={{fontSize:12,color:"#334155"}}>{enriched.length} instrumentos</span>
          {loaded.length>0&&<>
            <span style={{...MONO,fontSize:11,color:"#22c55e"}}>▲{upCount}</span>
            <span style={{...MONO,fontSize:11,color:"#ef4444"}}>▼{dnCount}</span>
          </>}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",background:"#0b0f18",
          border:"1px solid #1e2a3a",borderRadius:6,padding:"4px 10px",gap:6}}>
          <span style={{color:"#334155",fontSize:12}}>🔍</span>
          <input value={filter} onChange={e=>setFilter(e.target.value)}
            placeholder="Filtrar en esta tabla…"
            style={{background:"transparent",border:"none",outline:"none",color:"#e2e8f0",
              fontSize:12,fontFamily:"inherit",width:160}}/>
          {filter&&<button onClick={()=>setFilter("")}
            style={{background:"transparent",border:"none",color:"#334155",cursor:"pointer",fontSize:12}}>✕</button>}
        </div>
      </div>

      {loading&&(
        <div style={{height:3,background:"#1e2a3a",borderRadius:2,marginBottom:6,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.max(5,loaded.length/Math.max(enriched.length,1)*100)}%`,
            background:"#f59e0b",borderRadius:2,transition:"width .4s"}}/>
        </div>
      )}

      <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:10,overflow:"hidden"}}>
        {/* Header */}
        <div style={{display:"grid",gridTemplateColumns:COLS,padding:"9px 14px",
          borderBottom:"1px solid #1e2a3a",gap:8,alignItems:"center"}}>
          <div style={{fontSize:9,color:"#2d3748"}}>#</div>
          <div/>
          <Th label="Ticker" k="s" left/>
          <Th label="Empresa" k="n" left/>
          {showPais&&<div style={{fontSize:9,color:"#334155",textTransform:"uppercase",letterSpacing:"0.07em"}}>País</div>}
          <div style={{fontSize:9,color:"#334155",textTransform:"uppercase",letterSpacing:"0.07em"}}>Sector</div>
          <Th label="Precio" k="price"/>
          <Th label="Cambio" k="chg"/>
          <Th label="Cap. Merc." k="cap"/>
          <Th label="Volumen" k="vol"/>
          <div style={{fontSize:9,color:"#334155",textAlign:"right",textTransform:"uppercase",letterSpacing:"0.07em"}}>7D</div>
          <div/>
        </div>

        {/* Filas */}
        <div style={{maxHeight:"60vh",overflowY:"auto"}}>
          {enriched.length===0?(
            <div style={{padding:40,textAlign:"center",color:"#334155",fontSize:13}}>Sin resultados para "{filter}"</div>
          ):enriched.map((r,i)=>{
            const isUp=(r.chg||0)>=0;
            const c=isUp?"#22c55e":"#ef4444";
            return(
              <div key={r.s}
                style={{display:"grid",gridTemplateColumns:COLS,padding:"9px 14px",
                  borderBottom:"1px solid #111827",gap:8,alignItems:"center",cursor:"pointer"}}
                onClick={()=>onAnalyze(r.s)}
                onMouseEnter={e=>e.currentTarget.style.background="#141e2e"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{...MONO,fontSize:10,color:"#2d3748"}}>{i+1}</div>
                <StockLogo ticker={r.s} name={r.n} size={24}/>
                <div style={{...MONO,fontSize:12,color:"#f59e0b",fontWeight:600}}>{r.s}</div>
                <div style={{fontSize:12,color:"#cbd5e1",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.n}</div>
                {showPais&&<div style={{fontSize:13}}>{r.pais||"—"}</div>}
                <div style={{fontSize:10,color:"#4a5568",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.sec||"—"}</div>
                {!r.loaded?(
                  <div style={{height:10,background:"#1e2a3a",borderRadius:2,gridColumn:showPais?"7/11":"6/10",animation:"pulse 1.5s ease-in-out infinite"}}/>
                ):(
                  <>
                    <div style={{...MONO,fontSize:12,color:"#e2e8f0",textAlign:"right"}}>{fmt(r.price,2)}</div>
                    <div style={{textAlign:"right"}}>
                      <span style={{...MONO,fontSize:11,color:c,background:`${c}15`,padding:"2px 6px",borderRadius:3}}>
                        {isUp?"▲":"▼"} {fmtPct(r.chg)}
                      </span>
                    </div>
                    <div style={{...MONO,fontSize:11,color:"#64748b",textAlign:"right"}}>{fmtCap(r.cap)}</div>
                    <div style={{...MONO,fontSize:11,color:"#4a5568",textAlign:"right"}}>{fmtVol(r.vol)}</div>
                    <div style={{display:"flex",justifyContent:"center"}}>
                      <Spark pct={r.chg} seed={r.s.charCodeAt(0)*31+(r.s.charCodeAt(1)||0)*7}/>
                    </div>
                  </>
                )}
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <button onClick={e=>{e.stopPropagation();onAnalyze(r.s);}}
                    style={{background:"none",border:"1px solid #1e2a3a",borderRadius:4,padding:"2px 8px",
                      color:"#4a5568",fontSize:10,fontFamily:"inherit",cursor:"pointer"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b";e.currentTarget.style.color="#f59e0b";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#1e2a3a";e.currentTarget.style.color="#4a5568";}}>
                    →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{padding:"8px 14px",borderTop:"1px solid #1e2a3a",display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:10,color:"#2d3748"}}>Clic en cualquier fila para ver ficha completa</span>
          <span style={{...MONO,fontSize:10,color:"#2d3748"}}>{enriched.length} / {rows.length}</span>
        </div>
      </div>
    </div>
  );
};

// ── MARKET PRINCIPAL ──────────────────────────────────────────────────────────
export default function Market({onAnalyze: externalAnalyze}) {
  const [tab,setTab]           = useState("ibex35");
  const [prices,setPrices]     = useState({});
  const [loading,setLoading]   = useState(true);
  const [cd,setCd]             = useState(30);
  const [selected,setSelected] = useState(null);
  const [extraRows,setExtra]   = useState([]);
  const timerRef=useRef(null), cntRef=useRef(null);

  const handleAnalyze = sym => {
    setSelected(sym);
    if(externalAnalyze) externalAnalyze(sym);
  };

  // Cargar precios del mercado activo
  const currentMarket = MARKETS.find(m=>m.id===tab)||MARKETS[0];
  const allRows = useMemo(()=>[...currentMarket.data, ...extraRows.filter(e=>!currentMarket.data.find(r=>r.s===e.s))],[tab,extraRows]);

  const loadPrices = useCallback(async(silent=false)=>{
    if(!silent) setLoading(true);
    const syms = allRows.map(r=>r.s);
    const batches=[];
    for(let i=0;i<syms.length;i+=50) batches.push(syms.slice(i,i+50));
    // Batches en paralelo — mucho más rápido que secuencial
    const results = await Promise.allSettled(
      batches.map(batch => fcFetch(`${API_BASE}/market/quotes?symbols=${batch.join(",")}`,20000))
    );
    const map = {};
    results.forEach(r => {
      if(r.status==="fulfilled" && Array.isArray(r.value))
        r.value.forEach(d=>{ if(!d.error) map[d.symbol]=d; });
    });
    setPrices(prev=>({...prev,...map}));
    setLoading(false); setCd(30);
  },[allRows]);

  // Cuando cambia el tab, cargar los precios nuevos
  useEffect(()=>{
    setLoading(true);
    loadPrices();
    clearInterval(timerRef.current); clearInterval(cntRef.current);
    timerRef.current=setInterval(()=>loadPrices(true),30000);
    cntRef.current=setInterval(()=>setCd(c=>c>0?c-1:30),1000);
    return()=>{clearInterval(timerRef.current);clearInterval(cntRef.current);};
  },[tab]);

  const handleSearchSelect = item => {
    const sym=item.symbol;
    if(!sym)return;
    // Añadir a extraRows si no está
    if(!extraRows.find(r=>r.s===sym)){
      setExtra(prev=>[{s:sym,n:item.name||sym,sec:item.type||"Acción",pais:""},  ...prev]);
    }
    handleAnalyze(sym);
  };

  // Contadores globales
  const upCount  = Object.values(prices).filter(p=>(p.change_percent||0)>=0).length;
  const dnCount  = Object.values(prices).filter(p=>(p.change_percent||0)<0).length;
  const totalLoaded = Object.keys(prices).length;

  if(selected){
    return <StockDetail symbol={selected} onClose={()=>setSelected(null)}/>;
  }

  return(
    <div style={{background:"#0b0f18",minHeight:"100vh",color:"#e2e8f0",fontFamily:"'Inter',sans-serif"}}>
      <style>{`
        @keyframes pulse{0%,100%{opacity:.4}50%{opacity:.8}}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:#0b0f18}
        ::-webkit-scrollbar-thumb{background:#1e2a3a;border-radius:3px}
        ::-webkit-scrollbar-thumb:hover{background:#2a3a50}
      `}</style>
      <div style={{maxWidth:1600,margin:"0 auto",padding:"20px 24px"}}>

        {/* HEADER */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontSize:20,fontWeight:700,color:"#f1f5f9"}}>Mercado Global</div>
            <div style={{fontSize:11,color:"#4a5568",marginTop:2}}>
              {MARKETS.reduce((a,m)=>a+m.data.length,0)}+ acciones en {MARKETS.length} mercados · actualización en {cd}s
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {totalLoaded>0&&<>
              <span style={{...MONO,fontSize:12,color:"#22c55e",background:"#22c55e15",padding:"4px 10px",borderRadius:5}}>▲ {upCount} subidas</span>
              <span style={{...MONO,fontSize:12,color:"#ef4444",background:"#ef444415",padding:"4px 10px",borderRadius:5}}>▼ {dnCount} bajadas</span>
            </>}
            <button onClick={()=>loadPrices(true)}
              style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:6,padding:"7px 14px",
                color:"#64748b",fontSize:12,fontFamily:"inherit",cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.color="#e2e8f0"}
              onMouseLeave={e=>e.currentTarget.style.color="#64748b"}>
              ↺ Actualizar
            </button>
          </div>
        </div>

        {/* BUSCADOR */}
        <div style={{background:"#111827",border:"1px solid #1e2a3a",borderRadius:10,
          padding:"12px 16px",marginBottom:14,display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <SearchBar onSelect={handleSearchSelect}/>
          <span style={{fontSize:11,color:"#2d3748"}}>Busca cualquier acción, ETF o fondo · clic para ver ficha completa</span>
        </div>

        {/* TABS DE MERCADOS */}
        <div style={{display:"flex",gap:4,marginBottom:14,flexWrap:"wrap"}}>
          {MARKETS.map(m=>(
            <button key={m.id} onClick={()=>setTab(m.id)}
              style={{padding:"7px 14px",border:"1px solid #1e2a3a",borderRadius:6,
                background:tab===m.id?"#1e3050":"transparent",
                color:tab===m.id?"#e2e8f0":"#4a5568",
                fontSize:12,fontFamily:"inherit",cursor:"pointer",
                borderColor:tab===m.id?"#2a4070":"#1e2a3a"}}
              onMouseEnter={e=>{if(tab!==m.id)e.currentTarget.style.color="#94a3b8";}}
              onMouseLeave={e=>{if(tab!==m.id)e.currentTarget.style.color="#4a5568";}}>
              {m.label}
              <span style={{...MONO,fontSize:10,color:"#334155",marginLeft:6}}>{m.data.length}</span>
            </button>
          ))}
        </div>

        {/* TABLA */}
        <StockTable
          key={tab}
          rows={allRows}
          prices={prices}
          onAnalyze={handleAnalyze}
          loading={loading}
          showPais={tab==="europa"||tab==="asia"}
        />

      </div>
    </div>
  );
}
