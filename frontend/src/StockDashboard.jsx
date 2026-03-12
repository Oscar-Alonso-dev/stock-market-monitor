import { useState, useEffect, useCallback, useRef } from "react";

import { API_BASE } from "./config.js";
const REFRESH = 30000;

const fmt = (n, dec = 2) => n != null && !isNaN(n) ? Number(n).toFixed(dec) : "—";
const fmtPct = (n) => n != null && !isNaN(n) ? `${n > 0 ? "+" : ""}${fmt(n)}%` : "—";
const fmtB = (n) => {
  if (n == null) return "—";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}T`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}B`;
  return `$${n.toFixed(2)}M`;
};

const LineChart = ({ data, height = 220, showVolume = false }) => {
  const [hovered, setHovered] = useState(null);
  if (!data?.length) return null;
  const W = 600, H = height, PT = 8, PB = showVolume ? 45 : 18;
  const cw = W, ch = H - PT - PB;
  const prices = data.map(d => d.price);
  const minP = Math.min(...prices), maxP = Math.max(...prices), rng = maxP - minP || 1;
  const x = i => (i / (data.length - 1)) * cw;
  const y = p => PT + ch - ((p - minP) / rng) * ch;
  const pathD = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.price).toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${x(data.length-1)},${H-PB} L${x(0)},${H-PB} Z`;
  const isUp = data[data.length-1].price >= data[0].price;
  const color = isUp ? "#22c55e" : "#ef4444";
  const gid = `lc${Math.random().toString(36).slice(2,6)}`;
  const vols = data.map(d => d.vol || 0);
  const maxV = Math.max(...vols) || 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: `${height}px` }}
      onMouseLeave={() => setHovered(null)}
      onMouseMove={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = (e.clientX - rect.left) / rect.width * W;
        setHovered(Math.max(0, Math.min(data.length-1, Math.round(mx/cw*(data.length-1)))));
      }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showVolume && vols.map((v, i) => (
        <rect key={i} x={x(i)-0.8} y={H-PB-(v/maxV)*35} width="1.6" height={(v/maxV)*35} fill={color} opacity="0.2" />
      ))}
      <path d={areaD} fill={`url(#${gid})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      {hovered != null && (
        <>
          <line x1={x(hovered)} y1={PT} x2={x(hovered)} y2={H-PB} stroke="#ffffff10" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx={x(hovered)} cy={y(data[hovered].price)} r="3.5" fill={color} />
          <rect x={Math.min(x(hovered)-52,W-115)} y={y(data[hovered].price)-30} width="110" height="24" rx="4" fill="#1a2535" />
          <text x={Math.min(x(hovered)-52,W-115)+55} y={y(data[hovered].price)-13} textAnchor="middle" fill="#e2e8f0" fontSize="11" fontFamily="JetBrains Mono">
            ${data[hovered].price?.toFixed(2)} · {data[hovered].date?.toLocaleDateString?.("es-ES",{day:"2-digit",month:"short"})||""}
          </text>
        </>
      )}
    </svg>
  );
};

const GaugeBar = ({ label, value, max = 100, color = "#22c55e", suffix = "%" }) => (
  <div style={{ marginBottom: "12px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
      <span style={{ fontSize: "11px", color: "#4a5568" }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "12px", color: "#cbd5e1" }}>{fmt(value)}{suffix}</span>
    </div>
    <div style={{ height: "3px", background: "#1e2a3a", borderRadius: "2px" }}>
      <div style={{ height: "100%", width: `${Math.min((value/max)*100,100)}%`, background: color, borderRadius: "2px" }} />
    </div>
  </div>
);

const DonutChart = ({ buy, hold, sell }) => {
  const total = buy + hold + sell || 1;
  const cx = 60, cy = 60, r = 44, sw = 14;
  const arc = (start, end, color) => {
    if (end - start <= 0.005) return null;
    const s = start*2*Math.PI - Math.PI/2, e = end*2*Math.PI - Math.PI/2;
    const x1 = cx+r*Math.cos(s), y1 = cy+r*Math.sin(s);
    const x2 = cx+r*Math.cos(e), y2 = cy+r*Math.sin(e);
    return <path d={`M${x1},${y1} A${r},${r} 0 ${end-start>0.5?1:0} 1 ${x2},${y2}`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />;
  };
  const bp = buy/total, hp = hold/total;
  return (
    <svg viewBox="0 0 120 120" style={{ width: "110px", height: "110px" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2a3a" strokeWidth={sw} />
      {arc(0, bp-0.01, "#22c55e")}
      {arc(bp, bp+hp-0.01, "#f59e0b")}
      {arc(bp+hp, 0.999, "#ef4444")}
      <text x={cx} y={cy-4} textAnchor="middle" fill="#e2e8f0" fontSize="16" fontWeight="bold" fontFamily="JetBrains Mono">{Math.round(bp*100)}%</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill="#4a5568" fontSize="9" fontFamily="Inter">COMPRAR</text>
    </svg>
  );
};

const genPrice = (base) => {
  const pts = []; let p = base * 0.82; const now = new Date();
  for (let i = 364; i >= 0; i--) {
    p *= 1 + (Math.random()-0.47)*0.025;
    const d = new Date(now); d.setDate(d.getDate()-i);
    pts.push({ date: d, price: parseFloat(p.toFixed(2)), vol: Math.floor(Math.random()*80e6+20e6) });
  }
  return pts;
};

const buildAnalysts = (data) => {
  if (!data?.length) return { buy: 32, hold: 10, sell: 3, history: [], priceTargets: { low:185, avg:227, high:275 } };
  const l = data[0];
  return { buy: (l.strongBuy||0)+(l.buy||0), hold: l.hold||0, sell: (l.sell||0)+(l.strongSell||0), history: data, priceTargets: { low:185, avg:227, high:275 } };
};

const buildNews = (data) => {
  if (!data?.length) return [];
  return data.map(n => ({
    title: n.headline, source: n.source, time: n.datetime ? new Date(n.datetime*1000).toLocaleDateString("es-ES",{day:"2-digit",month:"short"}) : "", url: n.url, summary: n.summary,
    sentiment: n.headline?.toLowerCase().match(/beat|record|growth|upgrade|strong|profit|surge/) ? "positive" : "negative",
  }));
};

export default function StockDashboard({ initialSymbol }) {
  const startSym = initialSymbol || "AAPL";
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [symbol, setSymbol]   = useState(startSym);
  const [quote, setQuote]     = useState(null);
  const [profile, setProfile] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [analysts, setAnalysts]   = useState(null);
  const [news, setNews]       = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [tab, setTab]         = useState("overview");
  const [range, setRange]     = useState("1Y");
  const [countdown, setCountdown] = useState(30);
  // Caché en memoria para navegación rápida entre símbolos
  // eslint-disable-next-line
  const _dashCache = useRef({}).current;
  const timerRef = useRef(null);
  const countRef = useRef(null);
  const symRef = useRef(startSym);

  const rangeMap = { "1S": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };

  const load = useCallback(async (sym, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      // Caché en memoria — si ya se cargó este símbolo recientemente, instant
      const cacheKey = `dash:${sym}`;
      const cached = _dashCache[cacheKey];
      const isFresh = cached && (Date.now() - cached.ts < 30000); // 30s

      if (isFresh) {
        const {q,p,m,r,n,e} = cached;
        setQuote(q); setProfile(p); setFinancials(m);
        setAnalysts(buildAnalysts(r)); setNews(buildNews(n));
        setEarnings(Array.isArray(e) ? e.slice(0,8) : []);
        if (!silent) setPriceHistory(genPrice(q.current_price || q.previous_close || 150));
        setCountdown(30);
        if (!silent) setLoading(false);
        return;
      }

      // Todas las peticiones en paralelo con fetch nativo (ya están en caché del backend)
      const [qRes, pRes, mRes, rRes, nRes, eRes] = await Promise.all([
        fetch(`${API_BASE}/stocks/${sym}/quote`),
        fetch(`${API_BASE}/stocks/${sym}/profile`),
        fetch(`${API_BASE}/stocks/${sym}/metrics`),
        fetch(`${API_BASE}/stocks/${sym}/recommendations`),
        fetch(`${API_BASE}/stocks/${sym}/news`),
        fetch(`${API_BASE}/stocks/${sym}/earnings`),
      ]);
      const [q, p, m, r, n, e] = await Promise.all([
        qRes.json(), pRes.json(), mRes.json(), rRes.json(), nRes.json(), eRes.json()
      ]);

      // Guardar en caché de componente
      _dashCache[cacheKey] = {q, p, m, r, n, e, ts: Date.now()};

      setQuote(q); setProfile(p); setFinancials(m);
      setAnalysts(buildAnalysts(r)); setNews(buildNews(n));
      setEarnings(Array.isArray(e) ? e.slice(0,8) : []);
      if (!silent) setPriceHistory(genPrice(q.current_price || q.previous_close || 150));
      setCountdown(30);
    } catch { if (!silent) setError("No se puede conectar al backend. Asegúrate de que está corriendo en :8000"); }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    load(startSym);
    timerRef.current = setInterval(() => load(symRef.current, true), REFRESH);
    countRef.current = setInterval(() => setCountdown(c => c > 0 ? c-1 : 30), 1000);
    return () => { clearInterval(timerRef.current); clearInterval(countRef.current); };
  }, [load]);

  const pick = (sym) => {
    setSymbol(sym); symRef.current = sym;
    setQuery(""); setResults([]); setTab("overview");
    load(sym);
  };

  const search = async (v) => {
    setQuery(v);
    if (v.length < 2) { setResults([]); return; }
    try {
      const r = await fetch(`${API_BASE}/search?q=${encodeURIComponent(v)}&limit=15`);
      const d = await r.json();
      setResults((d.result||[]).slice(0,8));
    } catch { setResults([]); }
  };

  const isUp = (quote?.change||0) >= 0;
  const accent = isUp ? "#22c55e" : "#ef4444";
  const chartData = priceHistory.slice(-rangeMap[range]);

  const S = {
    card: { background: "#111827", border: "1px solid #1e2a3a", borderRadius: "10px" },
    lbl: { fontSize: "10px", fontWeight: 600, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase" },
    mono: { fontFamily: "'JetBrains Mono', monospace" },
  };

  return (
    <div style={{ background: "#0b0f18", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "24px 28px" }}>

        {error && <div style={{ background: "#1a0a0a", border: "1px solid #ef444430", borderRadius: "8px", padding: "12px 16px", color: "#ef4444", fontSize: "13px", marginBottom: "16px" }}>⚠ {error}</div>}

        {/* SEARCH */}
        <div style={{ position: "relative", marginBottom: "20px", maxWidth: "460px" }}>
          <div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#334155" }}>⌕</div>
          <input value={query} onChange={e => search(e.target.value)} placeholder="Busca por ticker o nombre de empresa..."
            style={{ width: "100%", background: "#111827", border: "1px solid #1e2a3a", borderRadius: "8px", padding: "10px 14px 10px 36px", color: "#e2e8f0", fontSize: "13px", fontFamily: "inherit" }} />
          {results.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, background: "#111827", border: "1px solid #1e2a3a", borderRadius: "8px", overflow: "hidden", zIndex: 200, boxShadow: "0 20px 40px #00000060" }}>
              {results.map((r, i) => (
                <div key={i} onClick={() => pick(r.symbol)}
                  style={{ padding: "10px 14px", borderBottom: i<results.length-1?"1px solid #0f1622":"none", display: "flex", justifyContent: "space-between", cursor: "pointer", transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#141e2e"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ ...S.mono, fontSize: "13px", color: "#f59e0b", fontWeight: 500 }}>{r.symbol}</span>
                    <span style={{ fontSize: "12px", color: "#4a5568" }}>{r.description}</span>
                  </div>
                  <span style={{ fontSize: "10px", color: "#334155", background: "#1e2a3a", padding: "2px 7px", borderRadius: "3px" }}>{r.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display: "grid", gap: "14px" }}>
            {[180, 260, 140].map((h, i) => <div key={i} style={{ height: `${h}px`, ...S.card }} />)}
          </div>
        ) : quote && (
          <>
            {/* HERO */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: "14px", marginBottom: "14px" }}>
              <div style={{ ...S.card, padding: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    {profile?.logo && <img src={profile.logo} alt="" style={{ width: "38px", height: "38px", borderRadius: "8px", background: "#fff", padding: "2px", objectFit: "contain" }} />}
                    <div>
                      <div style={{ ...S.mono, fontSize: "20px", color: "#f1f5f9" }}>{symbol}</div>
                      <div style={{ fontSize: "12px", color: "#4a5568" }}>{profile?.name} · {profile?.exchange}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ ...S.mono, fontSize: "34px", color: "#f1f5f9", lineHeight: 1 }}>${fmt(quote.current_price)}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginTop: "6px", padding: "4px 10px", background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: "5px", color: accent, fontSize: "13px" }}>
                      {isUp ? "▲" : "▼"} {fmt(Math.abs(quote.change))} ({fmtPct(quote.change_percent)})
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "8px" }}>
                  {[
                    { l: "Apertura", v: `$${fmt(quote.open)}` },
                    { l: "Máximo", v: `$${fmt(quote.high)}`, c: "#22c55e" },
                    { l: "Mínimo", v: `$${fmt(quote.low)}`, c: "#ef4444" },
                    { l: "Cierre ant.", v: `$${fmt(quote.previous_close)}` },
                    { l: "Cap. Mercado", v: fmtB(profile?.marketCapitalization) },
                  ].map((s, i) => (
                    <div key={i} style={{ background: "#0b0f18", border: "1px solid #151e2d", borderRadius: "7px", padding: "10px 12px" }}>
                      <div style={{ ...S.lbl, fontSize: "9px", marginBottom: "5px" }}>{s.l}</div>
                      <div style={{ ...S.mono, fontSize: "14px", color: s.c || "#e2e8f0" }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ ...S.card, padding: "18px" }}>
                <div style={{ ...S.lbl, marginBottom: "12px" }}>Perfil de empresa</div>
                {[
                  { l: "Sector", v: profile?.finnhubIndustry },
                  { l: "País", v: profile?.country },
                  { l: "Moneda", v: profile?.currency },
                  { l: "IPO", v: profile?.ipo },
                  { l: "52W Máx", v: financials?.["52weekHigh"] ? `$${fmt(financials["52weekHigh"])}` : "—", c: "#22c55e" },
                  { l: "52W Mín", v: financials?.["52weekLow"] ? `$${fmt(financials["52weekLow"])}` : "—", c: "#ef4444" },
                  { l: "Beta", v: fmt(financials?.beta) },
                  { l: "Div. Yield", v: financials?.dividendYield ? `${fmt(financials.dividendYield)}%` : "—" },
                ].map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #111827" }}>
                    <span style={{ fontSize: "12px", color: "#4a5568" }}>{r.l}</span>
                    <span style={{ ...S.mono, fontSize: "12px", color: r.c || "#cbd5e1" }}>{r.v || "—"}</span>
                  </div>
                ))}
                <div style={{ fontSize: "10px", color: "#1e3050", marginTop: "10px", textAlign: "right" }}>↺ próx. actualización: {countdown}s</div>
              </div>
            </div>

            {/* CHART */}
            <div style={{ ...S.card, padding: "20px", marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <div style={{ ...S.lbl, marginBottom: "3px" }}>Precio histórico</div>
                  <div style={{ ...S.mono, fontSize: "18px", color: accent }}>{isUp ? "▲" : "▼"} {fmtPct(quote.change_percent)} hoy</div>
                </div>
                <div style={{ display: "flex", gap: "4px" }}>
                  {Object.keys(rangeMap).map(r => (
                    <button key={r} onClick={() => setRange(r)}
                      style={{ padding: "5px 11px", border: "1px solid #1e2a3a", borderRadius: "5px", background: range===r?"#1e2a3a":"transparent", color: range===r?"#e2e8f0":"#4a5568", fontSize: "11px", fontFamily: "inherit", transition: "all .15s" }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <LineChart data={chartData} height={200} showVolume />
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid #1e2a3a", marginTop: "12px" }}>
                {[
                  { l: `Mín ${range}`, v: `$${fmt(Math.min(...chartData.map(d=>d.price)))}`, c: "#ef4444" },
                  { l: `Máx ${range}`, v: `$${fmt(Math.max(...chartData.map(d=>d.price)))}`, c: "#22c55e" },
                  { l: "Variación", v: fmtPct(((chartData.at(-1)?.price-chartData[0]?.price)/chartData[0]?.price)*100), c: chartData.at(-1)?.price>=chartData[0]?.price?"#22c55e":"#ef4444" },
                  { l: "Vol. medio", v: `${((chartData.reduce((a,d)=>a+(d.vol||0),0)/chartData.length)/1e6).toFixed(0)}M` },
                ].map((s, i) => (
                  <div key={i}>
                    <div style={{ ...S.lbl, fontSize: "9px", marginBottom: "4px" }}>{s.l}</div>
                    <div style={{ ...S.mono, fontSize: "16px", color: s.c||"#e2e8f0" }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* TABS */}
            <div style={{ display: "flex", borderBottom: "1px solid #1e2a3a", marginBottom: "14px" }}>
              {["overview","financials","analysts","news"].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ background: "transparent", border: "none", borderBottom: tab===t?"2px solid #f59e0b":"2px solid transparent", padding: "10px 20px", color: tab===t?"#e2e8f0":"#4a5568", fontSize: "13px", fontFamily: "inherit", fontWeight: tab===t?600:400, transition: "all .15s", marginBottom: "-1px", textTransform: "capitalize" }}>
                  {t === "overview" ? "Resumen" : t === "financials" ? "Finanzas" : t === "analysts" ? "Analistas" : "Noticias"}
                </button>
              ))}
            </div>

            {tab === "overview" && financials && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
                <div style={{ ...S.card, padding: "18px" }}>
                  <div style={{ ...S.lbl, marginBottom: "14px" }}>Valoración</div>
                  {[
                    { l:"P/E Ratio",v:fmt(financials.peRatio) },
                    { l:"P/B Ratio",v:fmt(financials.pbRatio) },
                    { l:"P/S Ratio",v:fmt(financials.psRatio) },
                    { l:"EV/EBITDA",v:fmt(financials.evEbitda) },
                    { l:"Div. Yield",v:financials.dividendYield?`${fmt(financials.dividendYield)}%`:"—" },
                    { l:"Payout Ratio",v:financials.payoutRatio?`${fmt(financials.payoutRatio)}%`:"—" },
                  ].map((r,i) => (
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #111827" }}>
                      <span style={{ fontSize:"12px",color:"#4a5568" }}>{r.l}</span>
                      <span style={{ ...S.mono,fontSize:"13px",color:"#cbd5e1" }}>{r.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ ...S.card, padding: "18px" }}>
                  <div style={{ ...S.lbl, marginBottom: "14px" }}>Rentabilidad</div>
                  <GaugeBar label="Margen Bruto" value={financials.grossMargin} color="#22c55e" />
                  <GaugeBar label="Margen Operativo" value={financials.operatingMargin} color="#22c55e" />
                  <GaugeBar label="Margen Neto" value={financials.netMargin} color="#22c55e" />
                  <GaugeBar label="ROE" value={financials.roe} max={200} color="#f59e0b" />
                  <GaugeBar label="ROA" value={financials.roa} max={50} color="#f59e0b" />
                </div>
                <div style={{ ...S.card, padding: "18px" }}>
                  <div style={{ ...S.lbl, marginBottom: "14px" }}>Balance / Riesgo</div>
                  {[
                    { l:"Deuda/Equity",v:fmt(financials.debtToEquity),warn:financials.debtToEquity>2 },
                    { l:"Current Ratio",v:fmt(financials.currentRatio),warn:financials.currentRatio<1 },
                    { l:"Beta",v:fmt(financials.beta) },
                    { l:"Crec. EPS",v:financials.epsGrowth?`${fmt(financials.epsGrowth)}%`:"—" },
                  ].map((r,i) => (
                    <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #111827" }}>
                      <span style={{ fontSize:"12px",color:"#4a5568" }}>{r.l}</span>
                      <span style={{ ...S.mono,fontSize:"13px",color:r.warn?"#f59e0b":"#cbd5e1" }}>{r.v}</span>
                    </div>
                  ))}
                  <div style={{ marginTop:"14px",padding:"12px",background:"#0b0f18",borderRadius:"8px",border:"1px solid #151e2d" }}>
                    <div style={{ ...S.lbl,fontSize:"9px",marginBottom:"8px" }}>Rango 52 semanas</div>
                    <div style={{ display:"flex",justifyContent:"space-between" }}>
                      <div>
                        <div style={{ fontSize:"10px",color:"#ef4444",marginBottom:"2px" }}>Mínimo</div>
                        <div style={{ ...S.mono,fontSize:"15px",color:"#ef4444" }}>${fmt(financials["52weekLow"])}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:"10px",color:"#22c55e",marginBottom:"2px" }}>Máximo</div>
                        <div style={{ ...S.mono,fontSize:"15px",color:"#22c55e" }}>${fmt(financials["52weekHigh"])}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "financials" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div style={{ ...S.card, padding: "18px" }}>
                  <div style={{ ...S.lbl, marginBottom: "14px" }}>Métricas clave</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {financials && [
                      { l:"Margen Bruto",v:`${fmt(financials.grossMargin)}%`,c:"#22c55e" },
                      { l:"Margen Neto",v:`${fmt(financials.netMargin)}%`,c:"#22c55e" },
                      { l:"ROE",v:`${fmt(financials.roe)}%`,c:"#f59e0b" },
                      { l:"ROA",v:`${fmt(financials.roa)}%`,c:"#f59e0b" },
                      { l:"P/E",v:fmt(financials.peRatio) },
                      { l:"P/B",v:fmt(financials.pbRatio) },
                      { l:"Beta",v:fmt(financials.beta) },
                      { l:"EV/EBITDA",v:fmt(financials.evEbitda) },
                    ].map((s,i) => (
                      <div key={i} style={{ background:"#0b0f18",border:"1px solid #151e2d",borderRadius:"7px",padding:"12px" }}>
                        <div style={{ fontSize:"10px",color:"#334155",marginBottom:"4px" }}>{s.l}</div>
                        <div style={{ ...S.mono,fontSize:"18px",color:s.c||"#cbd5e1" }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ ...S.card, padding: "18px" }}>
                  <div style={{ ...S.lbl, marginBottom: "14px" }}>EPS Histórico</div>
                  {earnings.length > 0 ? (
                    <>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 80px 90px 80px",padding:"6px 10px",borderBottom:"1px solid #1e2a3a",gap:"8px" }}>
                        {["Período","Real","Estimado","Sorpresa"].map((h,i) => (
                          <div key={i} style={{ ...S.lbl,fontSize:"9px",textAlign:i>0?"right":"left" }}>{h}</div>
                        ))}
                      </div>
                      {earnings.slice(0,6).map((e,i) => (
                        <div key={i} style={{ display:"grid",gridTemplateColumns:"1fr 80px 90px 80px",padding:"9px 10px",borderBottom:"1px solid #111827",gap:"8px",alignItems:"center" }}>
                          <span style={{ fontSize:"12px",color:"#64748b" }}>{e.period?.slice(0,7)}</span>
                          <span style={{ ...S.mono,fontSize:"12px",color:"#22c55e",textAlign:"right" }}>${fmt(e.actual)}</span>
                          <span style={{ ...S.mono,fontSize:"12px",color:"#4a5568",textAlign:"right" }}>${fmt(e.estimate)}</span>
                          <span style={{ ...S.mono,fontSize:"11px",color:(e.surprise||0)>=0?"#22c55e":"#ef4444",textAlign:"right" }}>
                            {(e.surprise||0)>=0?"+":""}{fmt(e.surprisePercent)}%
                          </span>
                        </div>
                      ))}
                    </>
                  ) : <div style={{ fontSize:"13px",color:"#334155",padding:"30px",textAlign:"center" }}>Sin datos de EPS</div>}
                </div>
              </div>
            )}

            {tab === "analysts" && analysts && (
              <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ ...S.card, padding: "18px", textAlign: "center" }}>
                    <div style={{ ...S.lbl, marginBottom: "14px" }}>Consenso</div>
                    <DonutChart buy={analysts.buy} hold={analysts.hold} sell={analysts.sell} />
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginTop:"14px" }}>
                      {[
                        { l:"Comprar",v:analysts.buy,c:"#22c55e" },
                        { l:"Mantener",v:analysts.hold,c:"#f59e0b" },
                        { l:"Vender",v:analysts.sell,c:"#ef4444" },
                      ].map((r,i) => (
                        <div key={i} style={{ background:"#0b0f18",border:`1px solid ${r.c}25`,borderRadius:"7px",padding:"10px 6px" }}>
                          <div style={{ ...S.mono,fontSize:"22px",color:r.c }}>{r.v}</div>
                          <div style={{ fontSize:"9px",color:r.c,marginTop:"2px",opacity:0.7 }}>{r.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ ...S.card, padding: "18px" }}>
                    <div style={{ ...S.lbl, marginBottom: "14px" }}>Precio objetivo</div>
                    <div style={{ position:"relative",height:"4px",background:"#1e2a3a",borderRadius:"2px",margin:"8px 0 24px" }}>
                      <div style={{ position:"absolute",left:`${Math.min(Math.max(((quote.current_price-analysts.priceTargets.low)/(analysts.priceTargets.high-analysts.priceTargets.low))*100,0),100)}%`,top:"-5px",width:"14px",height:"14px",background:accent,borderRadius:"50%",transform:"translateX(-50%)",border:"2px solid #0b0f18" }} />
                      <div style={{ position:"absolute",left:0,top:"10px",fontSize:"10px",color:"#4a5568" }}>${analysts.priceTargets.low}</div>
                      <div style={{ position:"absolute",left:"50%",top:"10px",transform:"translateX(-50%)",fontSize:"10px",color:"#22c55e",fontWeight:600 }}>${analysts.priceTargets.avg}</div>
                      <div style={{ position:"absolute",right:0,top:"10px",fontSize:"10px",color:"#4a5568" }}>${analysts.priceTargets.high}</div>
                    </div>
                    <div style={{ display:"flex",justifyContent:"space-between" }}>
                      <div>
                        <div style={{ fontSize:"10px",color:"#334155",marginBottom:"3px" }}>Actual</div>
                        <div style={{ ...S.mono,fontSize:"16px" }}>${fmt(quote.current_price)}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:"10px",color:"#334155",marginBottom:"3px" }}>Potencial</div>
                        <div style={{ ...S.mono,fontSize:"16px",color:"#22c55e" }}>+{fmt(((analysts.priceTargets.avg-quote.current_price)/quote.current_price)*100)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ ...S.card, padding: "18px" }}>
                  <div style={{ ...S.lbl, marginBottom: "14px" }}>Historial de recomendaciones</div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 80px 70px 70px 70px",padding:"7px 10px",borderBottom:"1px solid #1e2a3a",gap:"8px" }}>
                    {["Período","Strong Buy","Buy","Hold","Sell"].map((h,i) => (
                      <div key={i} style={{ ...S.lbl,fontSize:"9px",textAlign:i>0?"right":"left" }}>{h}</div>
                    ))}
                  </div>
                  {(analysts.history||[]).slice(0,8).map((r,i) => (
                    <div key={i} style={{ display:"grid",gridTemplateColumns:"1fr 80px 70px 70px 70px",padding:"9px 10px",borderBottom:"1px solid #111827",gap:"8px",alignItems:"center",transition:"background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background="#141e2e"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                      <span style={{ fontSize:"12px",color:"#64748b" }}>{r.period?.slice(0,7)}</span>
                      <span style={{ ...S.mono,fontSize:"13px",color:"#22c55e",textAlign:"right" }}>{r.strongBuy}</span>
                      <span style={{ ...S.mono,fontSize:"13px",color:"#22c55e",textAlign:"right" }}>{r.buy}</span>
                      <span style={{ ...S.mono,fontSize:"13px",color:"#f59e0b",textAlign:"right" }}>{r.hold}</span>
                      <span style={{ ...S.mono,fontSize:"13px",color:"#ef4444",textAlign:"right" }}>{r.sell}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "news" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: "14px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {news.length > 0 ? news.map((n, i) => (
                    <a key={i} href={n.url||"#"} target="_blank" rel="noreferrer"
                      style={{ ...S.card, padding: "16px 18px", display: "flex", gap: "12px", transition: "border-color .15s" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor="#2a3a50"}
                      onMouseLeave={e => e.currentTarget.style.borderColor="#1e2a3a"}>
                      <div style={{ width:"3px",minWidth:"3px",background:n.sentiment==="positive"?"#22c55e":"#ef4444",borderRadius:"2px",alignSelf:"stretch" }} />
                      <div>
                        <div style={{ fontSize:"13px",color:"#cbd5e1",fontWeight:500,marginBottom:"6px",lineHeight:1.4 }}>{n.title}</div>
                        {n.summary && <div style={{ fontSize:"11px",color:"#4a5568",marginBottom:"8px",lineHeight:1.4 }}>{n.summary.slice(0,140)}...</div>}
                        <div style={{ display:"flex",gap:"10px" }}>
                          <span style={{ fontSize:"11px",color:"#4a5568" }}>{n.source}</span>
                          <span style={{ fontSize:"11px",color:"#4a5568" }}>·</span>
                          <span style={{ fontSize:"11px",color:"#334155" }}>{n.time}</span>
                          <span style={{ fontSize:"10px",color:n.sentiment==="positive"?"#22c55e":"#ef4444" }}>{n.sentiment==="positive"?"↑ Positivo":"↓ Negativo"}</span>
                        </div>
                      </div>
                    </a>
                  )) : <div style={{ ...S.card,padding:"40px",textAlign:"center",color:"#334155" }}>Sin noticias</div>}
                </div>
                <div style={{ display:"flex",flexDirection:"column",gap:"10px" }}>
                  <div style={{ ...S.card,padding:"18px" }}>
                    <div style={{ ...S.lbl,marginBottom:"14px" }}>Sentimiento</div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"14px" }}>
                      {[
                        { l:"Positivas",v:news.filter(n=>n.sentiment==="positive").length,c:"#22c55e" },
                        { l:"Negativas",v:news.filter(n=>n.sentiment==="negative").length,c:"#ef4444" },
                      ].map((s,i) => (
                        <div key={i} style={{ background:"#0b0f18",border:`1px solid ${s.c}20`,borderRadius:"8px",padding:"12px",textAlign:"center" }}>
                          <div style={{ ...S.mono,fontSize:"28px",color:s.c }}>{s.v}</div>
                          <div style={{ fontSize:"10px",color:s.c,opacity:0.7,marginTop:"2px" }}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    {news.length > 0 && <GaugeBar label="% Positivo" value={(news.filter(n=>n.sentiment==="positive").length/news.length)*100} color="#22c55e" />}
                  </div>
                  <div style={{ ...S.card,padding:"18px" }}>
                    <div style={{ ...S.lbl,marginBottom:"14px" }}>Fuentes</div>
                    {[...new Set(news.map(n=>n.source))].slice(0,6).map((s,i) => (
                      <div key={i} style={{ display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid #111827" }}>
                        <span style={{ fontSize:"12px",color:"#cbd5e1" }}>{s}</span>
                        <span style={{ ...S.mono,fontSize:"11px",color:"#4a5568" }}>{news.filter(n=>n.source===s).length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"20px",paddingTop:"14px",borderTop:"1px solid #1e2a3a" }}>
              <span style={{ fontSize:"11px",color:"#1e3050" }}>{financials?.source==="simulated"?"⚠ Algunos datos simulados.":"✓ Datos reales via Finnhub."}</span>
              <button onClick={() => load(symbol)} style={{ background:"#111827",border:"1px solid #1e2a3a",borderRadius:"6px",padding:"7px 16px",color:"#4a5568",fontSize:"11px",fontFamily:"inherit",transition:"all .15s" }}
                onMouseEnter={e => e.target.style.color="#e2e8f0"}
                onMouseLeave={e => e.target.style.color="#4a5568"}>
                ↺ Actualizar ahora
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
