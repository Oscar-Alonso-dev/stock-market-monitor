import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:8000";

const fmt = (n, dec = 2) => n != null && !isNaN(n) ? Number(n).toFixed(dec) : "—";
const fmtPct = (n) => n != null && !isNaN(n) ? `${n > 0 ? "+" : ""}${fmt(n)}%` : "—";
const fmtMoney = (n) => {
  if (n == null || isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${n < 0 ? "-" : ""}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${n < 0 ? "-" : ""}$${(abs / 1e3).toFixed(2)}K`;
  return `${n < 0 ? "-$" : "$"}${abs.toFixed(2)}`;
};

// ── Sparkline con tendencia real ───────────────────────────────────────────
const Sparkline = ({ change }) => {
  const pct = change || 0;
  const pts = [];
  let v = 100;
  const trend = pct / 24;
  for (let i = 0; i < 24; i++) {
    v *= 1 + trend / 100 + (Math.random() - 0.5) * 0.004;
    pts.push(v);
  }
  pts[pts.length - 1] = 100 * (1 + pct / 100);
  const min = Math.min(...pts), max = Math.max(...pts), rng = max - min || 1;
  const W = 100, H = 40;
  const x = (i) => (i / (pts.length - 1)) * W;
  const y = (v) => H - ((v - min) / rng) * (H - 4) - 2;
  const pathD = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");
  const areaD = `${pathD} L${W},${H} L0,${H} Z`;
  const color = pct >= 0 ? "#00c896" : "#ff4d6d";
  const gradId = `sg_${Math.random().toString(36).slice(2, 7)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100px", height: "40px" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

// ── Index Card ─────────────────────────────────────────────────────────────
const IndexCard = ({ name, ticker, label, data, loading }) => {
  const isUp = (data?.change_percent || 0) >= 0;
  const color = isUp ? "#00c896" : "#ff4d6d";
  return (
    <div style={{ background: "#0a1018", border: "1px solid #111d2e", borderRadius: "12px", padding: "18px 20px", transition: "border-color .2s", display: "flex", flexDirection: "column", gap: "10px" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#1e3050"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#111d2e"}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "9px", color: "#2a4060", letterSpacing: "0.14em", marginBottom: "4px" }}>{ticker.toUpperCase()}</div>
          <div style={{ fontSize: "13px", color: "#d8e4f0", fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: "10px", color: "#4a6a8a" }}>{label}</div>
        </div>
        {!loading && data && <Sparkline change={data?.change_percent} />}
      </div>
      {loading ? (
        <div style={{ height: "32px", background: "#111d2e", borderRadius: "6px" }} />
      ) : data ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontFamily: "'Bebas Neue'", fontSize: "28px", letterSpacing: "0.03em", color: "#f0f6ff", lineHeight: 1 }}>
            ${fmt(data?.current_price)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
            <div style={{ fontSize: "13px", color, fontWeight: 600 }}>{fmtPct(data?.change_percent)}</div>
            <div style={{ fontSize: "11px", color: "#4a6a8a" }}>{isUp ? "▲" : "▼"} {fmt(Math.abs(data?.change || 0))}</div>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: "11px", color: "#2a4060" }}>Sin datos</div>
      )}
    </div>
  );
};

// ── Main Home Component ────────────────────────────────────────────────────
export default function Home({ onNavigate }) {
  const [indices, setIndices]               = useState({});
  const [indicesLoading, setIndicesLoading] = useState(true);
  const [portfolio, setPortfolio]           = useState([]);
  const [portfolioPrices, setPortfolioPrices] = useState({});
  const [news, setNews]                     = useState([]);
  const [newsLoading, setNewsLoading]       = useState(true);
  const [time, setTime]                     = useState(new Date());

  const INDICES = [
    { ticker: "SPY",     name: "S&P 500",    label: "ETF — US Large Cap" },
    { ticker: "QQQ",     name: "NASDAQ 100", label: "ETF — US Tech" },
    { ticker: "DIA",     name: "DOW JONES",  label: "ETF — US Blue Chip" },
    { ticker: "EWG",     name: "DAX",        label: "ETF — Alemania" },
    { ticker: "EWP",     name: "IBEX 35",    label: "ETF — España" },
    { ticker: "GLD",     name: "ORO",        label: "ETF — Gold" },
    { ticker: "USO",     name: "PETRÓLEO",   label: "ETF — Crude Oil" },
    { ticker: "bitcoin", name: "BITCOIN",    label: "CoinGecko · Crypto", crypto: true },
  ];

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load indices
  const loadIndices = useCallback(async () => {
    setIndicesLoading(true);
    const results = {};
    await Promise.all(INDICES.map(async (idx) => {
      try {
        const url = idx.crypto
          ? `${API_BASE}/crypto/${idx.ticker}`
          : `${API_BASE}/stocks/${idx.ticker}/quote`;
        const r = await fetch(url);
        const d = await r.json();
        results[idx.ticker] = d;
      } catch {
        results[idx.ticker] = null;
      }
    }));
    setIndices(results);
    setIndicesLoading(false);
  }, []);

  // Load portfolio from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("portfolio") || "[]");
      setPortfolio(saved);
      if (saved.length) {
        Promise.all(saved.map(async (p) => {
          try {
            const r = await fetch(`${API_BASE}/stocks/${p.symbol}/quote`);
            const d = await r.json();
            return { symbol: p.symbol, price: d.current_price || d.previous_close || p.avgPrice };
          } catch {
            return { symbol: p.symbol, price: p.avgPrice };
          }
        })).then(results => {
          const prices = {};
          results.forEach(r => { prices[r.symbol] = r.price; });
          setPortfolioPrices(prices);
        });
      }
    } catch {}
  }, []);

  // Load market news
  useEffect(() => {
    const loadNews = async () => {
      setNewsLoading(true);
      try {
        const r = await fetch(`${API_BASE}/stocks/AAPL/news`);
        const d = await r.json();
        setNews(Array.isArray(d) ? d.slice(0, 5) : []);
      } catch { setNews([]); }
      setNewsLoading(false);
    };
    loadNews();
  }, []);

  useEffect(() => { loadIndices(); }, [loadIndices]);

  // Portfolio calculations
  const portfolioWithCalcs = portfolio.map(p => {
    const currentPrice = portfolioPrices[p.symbol] || p.avgPrice;
    const currentValue = currentPrice * p.shares;
    const costBasis = p.avgPrice * p.shares;
    const gainLoss = currentValue - costBasis;
    const gainLossPct = ((currentPrice - p.avgPrice) / p.avgPrice) * 100;
    return { ...p, currentPrice, currentValue, costBasis, gainLoss, gainLossPct };
  });
  const totalValue = portfolioWithCalcs.reduce((a, p) => a + p.currentValue, 0);
  const totalCost = portfolioWithCalcs.reduce((a, p) => a + p.costBasis, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  const portfolioIsUp = totalGainLoss >= 0;

  // Market sentiment
  const validIndices = INDICES.filter(i => indices[i.ticker]);
  const upCount = validIndices.filter(i => (indices[i.ticker]?.change_percent || 0) >= 0).length;
  const marketSentiment = validIndices.length > 0 ? (upCount / validIndices.length) * 100 : 50;
  const sentimentLabel = marketSentiment >= 70 ? "ALCISTA" : marketSentiment >= 40 ? "NEUTRAL" : "BAJISTA";
  const sentimentColor = marketSentiment >= 70 ? "#00c896" : marketSentiment >= 40 ? "#f59e0b" : "#ff4d6d";

  return (
    <div style={{ minHeight: "100vh", background: "#060a10", color: "#d8e4f0", fontFamily: "'IBM Plex Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500;600&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:#1e2d45}
        @keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade{animation:fade .35s ease forwards}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .blink{animation:blink 2s infinite}
        a{text-decoration:none}
      `}</style>

      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "28px" }}>

        {/* HERO HEADER */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: "48px", letterSpacing: "0.06em", lineHeight: 1 }}>
                MERCADO <span style={{ color: sentimentColor }}>{sentimentLabel}</span>
              </div>
              <div style={{ fontSize: "12px", color: "#4a6a8a", marginTop: "6px" }}>
                {upCount} de {validIndices.length} índices en positivo · {time.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Bebas Neue'", fontSize: "36px", color: "#d8e4f0", letterSpacing: "0.05em" }}>
                {time.toLocaleTimeString("es-ES")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                <div className="blink" style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00c896" }} />
                <span style={{ fontSize: "10px", color: "#2a4060", letterSpacing: "0.12em" }}>DATOS EN TIEMPO REAL</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: "16px", height: "4px", background: "#0d1a2e", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${marketSentiment}%`, background: sentimentColor, borderRadius: "2px", transition: "width 1s ease" }} />
          </div>
        </div>

        {/* INDICES GRID */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ fontSize: "9px", color: "#2a4060", letterSpacing: "0.14em", marginBottom: "14px" }}>PRINCIPALES ÍNDICES Y ACTIVOS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
            {INDICES.map(idx => (
              <IndexCard key={idx.ticker} {...idx} data={indices[idx.ticker]} loading={indicesLoading} />
            ))}
          </div>
          <div style={{ textAlign: "right", marginTop: "10px" }}>
            <button onClick={loadIndices}
              style={{ background: "transparent", border: "none", color: "#2a4060", fontSize: "10px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em" }}>
              ↻ ACTUALIZAR ÍNDICES
            </button>
          </div>
        </div>

        {/* PORTFOLIO SUMMARY + NEWS */}
        <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "20px" }}>

          {/* Portfolio Summary */}
          <div>
            <div style={{ fontSize: "9px", color: "#2a4060", letterSpacing: "0.14em", marginBottom: "14px" }}>MI PORTFOLIO</div>
            {portfolio.length === 0 ? (
              <div style={{ background: "#0a1018", border: "1px solid #111d2e", borderRadius: "12px", padding: "40px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>💼</div>
                <div style={{ fontSize: "12px", color: "#4a6a8a", marginBottom: "16px" }}>No tienes posiciones en tu portfolio</div>
                <button onClick={() => onNavigate("portfolio")}
                  style={{ background: "#00c896", border: "none", borderRadius: "8px", padding: "10px 20px", color: "#060a10", fontSize: "11px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em" }}>
                  + AÑADIR POSICIÓN
                </button>
              </div>
            ) : (
              <div style={{ background: "#0a1018", border: `1px solid ${portfolioIsUp ? "#00c89620" : "#ff4d6d20"}`, borderRadius: "12px", overflow: "hidden" }}>
                <div style={{ padding: "20px 22px", borderBottom: "1px solid #0d1a2e" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      <div style={{ fontSize: "9px", color: "#2a4060", letterSpacing: "0.12em", marginBottom: "6px" }}>VALOR TOTAL</div>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: "36px", color: "#f0f6ff", letterSpacing: "0.03em", lineHeight: 1 }}>{fmtMoney(totalValue)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: "22px", color: portfolioIsUp ? "#00c896" : "#ff4d6d" }}>{fmtPct(totalGainLossPct)}</div>
                      <div style={{ fontSize: "11px", color: portfolioIsUp ? "#00c896" : "#ff4d6d" }}>{portfolioIsUp ? "▲" : "▼"} {fmtMoney(totalGainLoss)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: "12px", height: "3px", background: "#0d1a2e", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(Math.max((totalValue / (totalCost * 1.5)) * 100, 10), 100)}%`, background: portfolioIsUp ? "#00c896" : "#ff4d6d", borderRadius: "2px" }} />
                  </div>
                </div>

                {portfolioWithCalcs.sort((a, b) => b.currentValue - a.currentValue).slice(0, 4).map((p, i) => (
                  <div key={i} style={{ padding: "12px 22px", borderBottom: "1px solid #0d1a2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ fontFamily: "'Bebas Neue'", fontSize: "16px", color: "#00c896", width: "50px" }}>{p.symbol}</div>
                      <div>
                        <div style={{ fontSize: "11px", color: "#d8e4f0" }}>{fmt(p.shares, 0)} acc. · ${fmt(p.avgPrice)}</div>
                        <div style={{ fontSize: "10px", color: "#4a6a8a" }}>{fmt((p.currentValue / totalValue) * 100)}% cartera</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "#d8e4f0" }}>{fmtMoney(p.currentValue)}</div>
                      <div style={{ fontSize: "11px", color: p.gainLossPct >= 0 ? "#00c896" : "#ff4d6d" }}>{fmtPct(p.gainLossPct)}</div>
                    </div>
                  </div>
                ))}

                <div style={{ padding: "12px 22px" }}>
                  <button onClick={() => onNavigate("portfolio")}
                    style={{ width: "100%", background: "#0d1a2e", border: "none", borderRadius: "6px", padding: "9px", color: "#4a6a8a", fontSize: "11px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em" }}>
                    VER PORTFOLIO COMPLETO →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* News */}
          <div>
            <div style={{ fontSize: "9px", color: "#2a4060", letterSpacing: "0.14em", marginBottom: "14px" }}>ÚLTIMAS NOTICIAS DEL MERCADO</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {newsLoading ? (
                [1,2,3,4,5].map(i => (
                  <div key={i} style={{ height: "70px", background: "#111d2e", borderRadius: "10px" }} />
                ))
              ) : news.length > 0 ? news.map((n, i) => (
                <a key={i} href={n.url || "#"} target="_blank" rel="noreferrer"
                  style={{ background: "#0a1018", border: "1px solid #111d2e", borderRadius: "10px", padding: "14px 18px", display: "flex", gap: "14px", alignItems: "flex-start", transition: "border-color .2s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#1e3050"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "#111d2e"}>
                  <div style={{ width: "3px", minWidth: "3px", height: "40px", background: n.sentiment === "positive" ? "#00c896" : "#ff4d6d", borderRadius: "2px" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", color: "#d8e4f0", fontWeight: 500, marginBottom: "6px", lineHeight: 1.4 }}>{n.title}</div>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <span style={{ fontSize: "10px", color: "#4a6a8a" }}>{n.source}</span>
                      <span style={{ fontSize: "10px", color: "#2a4060" }}>{n.time}</span>
                      <span style={{ fontSize: "10px", color: n.sentiment === "positive" ? "#00c896" : "#ff4d6d" }}>
                        {n.sentiment === "positive" ? "▲ POSITIVO" : "▼ NEGATIVO"}
                      </span>
                    </div>
                  </div>
                </a>
              )) : (
                <div style={{ background: "#0a1018", border: "1px solid #111d2e", borderRadius: "10px", padding: "40px", textAlign: "center", color: "#2a4060", fontSize: "12px" }}>
                  No hay noticias disponibles
                </div>
              )}
            </div>
          </div>
        </div>

        {/* QUICK ACCESS */}
        <div style={{ marginTop: "24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
          {[
            { icon: "📈", label: "ANALIZAR ACCIÓN", desc: "Busca cualquier ticker y analiza sus métricas", action: "dashboard", color: "#00c896" },
            { icon: "💼", label: "MI PORTFOLIO", desc: "Gestiona tus posiciones y trackea tu inversión", action: "portfolio", color: "#f59e0b" },
            { icon: "🔍", label: "BUSCAR MERCADO", desc: "Explora acciones, ETFs y más activos", action: "dashboard", color: "#3b82f6" },
          ].map((a, i) => (
            <button key={i} onClick={() => onNavigate(a.action)}
              style={{ background: "#0a1018", border: `1px solid ${a.color}25`, borderRadius: "12px", padding: "20px 22px", textAlign: "left", cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = `${a.color}08`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${a.color}25`; e.currentTarget.style.background = "#0a1018"; }}>
              <div style={{ fontSize: "24px", marginBottom: "10px" }}>{a.icon}</div>
              <div style={{ fontSize: "11px", color: a.color, letterSpacing: "0.12em", fontWeight: 700, marginBottom: "6px" }}>{a.label}</div>
              <div style={{ fontSize: "11px", color: "#4a6a8a", lineHeight: 1.4 }}>{a.desc}</div>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
