import { useState, useEffect, useCallback } from "react";
import { cacheFetch } from "./cache.js";
import { API_BASE } from "./config.js";

const CURRENCIES = [
  { code: "EUR", name: "Euro",              flag: "🇪🇺" },
  { code: "USD", name: "Dólar americano",   flag: "🇺🇸" },
  { code: "GBP", name: "Libra esterlina",   flag: "🇬🇧" },
  { code: "JPY", name: "Yen japonés",       flag: "🇯🇵" },
  { code: "CHF", name: "Franco suizo",      flag: "🇨🇭" },
  { code: "CAD", name: "Dólar canadiense",  flag: "🇨🇦" },
  { code: "AUD", name: "Dólar australiano", flag: "🇦🇺" },
  { code: "CNY", name: "Yuan chino",        flag: "🇨🇳" },
  { code: "HKD", name: "Dólar HK",         flag: "🇭🇰" },
  { code: "SEK", name: "Corona sueca",      flag: "🇸🇪" },
  { code: "NOK", name: "Corona noruega",    flag: "🇳🇴" },
  { code: "DKK", name: "Corona danesa",     flag: "🇩🇰" },
  { code: "PLN", name: "Esloti polaco",     flag: "🇵🇱" },
  { code: "CZK", name: "Corona checa",      flag: "🇨🇿" },
  { code: "HUF", name: "Forinto húngaro",   flag: "🇭🇺" },
  { code: "RON", name: "Leu rumano",        flag: "🇷🇴" },
  { code: "TRY", name: "Lira turca",        flag: "🇹🇷" },
  { code: "BRL", name: "Real brasileño",    flag: "🇧🇷" },
  { code: "MXN", name: "Peso mexicano",     flag: "🇲🇽" },
  { code: "ARS", name: "Peso argentino",    flag: "🇦🇷" },
  { code: "INR", name: "Rupia india",       flag: "🇮🇳" },
  { code: "KRW", name: "Won coreano",       flag: "🇰🇷" },
  { code: "SGD", name: "Dólar singapurense",flag: "🇸🇬" },
  { code: "NZD", name: "Dólar neozelandés", flag: "🇳🇿" },
  { code: "ZAR", name: "Rand sudafricano",  flag: "🇿🇦" },
];

const fmt = (n, dec = 4) => {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1000) return Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return Number(n).toFixed(dec);
};

const fmtAmount = (n) => {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
};

export default function Currency() {
  const [rates, setRates]       = useState(null);
  const [date, setDate]         = useState("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [amount, setAmount]     = useState("1000");
  const [fromCur, setFromCur]   = useState("EUR");
  const [toCur, setToCur]       = useState("USD");
  const [result, setResult]     = useState(null);
  const [converting, setConverting] = useState(false);
  const [favorites]             = useState(["USD", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY", "BRL"]);

  const loadRates = useCallback(async () => {
    try {
      const d = await cacheFetch(`${API_BASE}/currency/rates`, 3600000);
      setRates(d.rates);
      setDate(d.date);
      setLoading(false);
    } catch {
      setError("No se pueden cargar los tipos de cambio. Verifica que el backend está corriendo.");
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  const convert = useCallback(async () => {
    const amt = parseFloat(amount);
    if (!amt || !rates) return;
    setConverting(true);
    try {
      const r = await fetch(`${API_BASE}/currency/convert?amount=${amt}&from=${fromCur}&to=${toCur}`);
      const d = await r.json();
      setResult(d);
    } catch {
      setError("Error al convertir.");
    }
    setConverting(false);
  }, [amount, fromCur, toCur, rates]);

  // Auto-convert when inputs change
  useEffect(() => {
    if (rates && amount && parseFloat(amount) > 0) {
      const timer = setTimeout(convert, 300);
      return () => clearTimeout(timer);
    }
  }, [amount, fromCur, toCur, rates, convert]);

  const swap = () => { setFromCur(toCur); setToCur(fromCur); };

  const getRate = (from, to) => {
    if (!rates) return null;
    const inEur = 1 / rates[from];
    return inEur * rates[to];
  };

  const currencyInfo = (code) => CURRENCIES.find(c => c.code === code) || { code, name: code, flag: "🌍" };

  const S = {
    card: { background: "#111827", border: "1px solid #1e2a3a", borderRadius: "10px" },
    lbl: { fontSize: "10px", fontWeight: 600, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase" },
    mono: { fontFamily: "'JetBrains Mono', monospace" },
    select: {
      background: "#0b0f18", border: "1px solid #1e2a3a", borderRadius: "8px",
      padding: "10px 14px", color: "#e2e8f0", fontSize: "14px",
      fontFamily: "'Inter', sans-serif", width: "100%", cursor: "pointer",
    },
  };

  return (
    <div style={{ background: "#0b0f18", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px 28px" }}>

        {/* HEADER */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9" }}>Conversor de Divisas</div>
          <div style={{ fontSize: "12px", color: "#4a5568", marginTop: "3px" }}>
            Tipos de cambio en tiempo real · Base EUR · Fuente: Frankfurter API
            {date && <span style={{ marginLeft: "8px", color: "#334155" }}>Actualizado: {date}</span>}
          </div>
        </div>

        {error && (
          <div style={{ background: "#1a0a0a", border: "1px solid #ef444430", borderRadius: "8px", padding: "12px 16px", color: "#ef4444", fontSize: "13px", marginBottom: "16px" }}>
            ⚠ {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "20px" }}>

          {/* LEFT — Converter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Main converter */}
            <div style={{ ...S.card, padding: "24px" }}>
              <div style={{ ...S.lbl, marginBottom: "18px" }}>Convertir</div>

              {/* Amount input */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ ...S.lbl, fontSize: "9px", marginBottom: "7px" }}>Cantidad</div>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ ...S.select, fontSize: "24px", ...S.mono, padding: "14px 18px", fontWeight: 500 }}
                  placeholder="1000"
                />
              </div>

              {/* FROM / SWAP / TO */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 1fr", gap: "10px", alignItems: "end", marginBottom: "20px" }}>
                <div>
                  <div style={{ ...S.lbl, fontSize: "9px", marginBottom: "7px" }}>De</div>
                  <select value={fromCur} onChange={e => setFromCur(e.target.value)} style={S.select}>
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={swap} style={{ height: "42px", background: "#1e2a3a", border: "1px solid #2a3a50", borderRadius: "8px", color: "#94a3b8", fontSize: "18px", cursor: "pointer", transition: "all .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#2a3a50"; e.currentTarget.style.color = "#f59e0b"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#1e2a3a"; e.currentTarget.style.color = "#94a3b8"; }}>
                  ⇄
                </button>
                <div>
                  <div style={{ ...S.lbl, fontSize: "9px", marginBottom: "7px" }}>A</div>
                  <select value={toCur} onChange={e => setToCur(e.target.value)} style={S.select}>
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* RESULT */}
              <div style={{ background: "#0b0f18", border: "1px solid #1e2a3a", borderRadius: "10px", padding: "20px 24px" }}>
                {converting ? (
                  <div style={{ fontSize: "14px", color: "#334155" }}>Calculando...</div>
                ) : result ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div>
                        <div style={{ fontSize: "12px", color: "#4a5568", marginBottom: "4px" }}>
                          {currencyInfo(fromCur).flag} {fmtAmount(parseFloat(amount))} {fromCur} =
                        </div>
                        <div style={{ ...S.mono, fontSize: "36px", fontWeight: 500, color: "#f59e0b", lineHeight: 1 }}>
                          {fmtAmount(result.result)}
                        </div>
                        <div style={{ fontSize: "16px", color: "#94a3b8", marginTop: "4px" }}>
                          {currencyInfo(toCur).flag} {toCur}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "11px", color: "#334155", marginBottom: "4px" }}>Tipo de cambio</div>
                        <div style={{ ...S.mono, fontSize: "14px", color: "#94a3b8" }}>1 {fromCur} = {fmt(result.rate)} {toCur}</div>
                        <div style={{ ...S.mono, fontSize: "14px", color: "#64748b", marginTop: "4px" }}>1 {toCur} = {fmt(1 / result.rate)} {fromCur}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: "11px", color: "#2d3748" }}>Fecha del tipo: {result.date}</div>
                  </>
                ) : loading ? (
                  <div style={{ fontSize: "14px", color: "#334155" }}>Cargando tipos de cambio...</div>
                ) : (
                  <div style={{ fontSize: "14px", color: "#334155" }}>Introduce una cantidad para convertir</div>
                )}
              </div>
            </div>

            {/* QUICK AMOUNTS */}
            {result && (
              <div style={S.card}>
                <div style={{ padding: "13px 18px", borderBottom: "1px solid #1e2a3a" }}>
                  <span style={S.lbl}>Cantidades rápidas — {fromCur} → {toCur}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0" }}>
                  {[100, 500, 1000, 5000, 10000, 25000, 50000, 100000].map((amt, i) => {
                    const rate = result.rate;
                    const converted = amt * rate;
                    return (
                      <div key={i} onClick={() => setAmount(String(amt))}
                        style={{ padding: "12px 14px", borderRight: i % 4 < 3 ? "1px solid #111827" : "none", borderBottom: i < 4 ? "1px solid #111827" : "none", cursor: "pointer", transition: "background .15s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#141e2e"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ ...S.mono, fontSize: "12px", color: "#4a5568", marginBottom: "2px" }}>{amt.toLocaleString("es-ES")} {fromCur}</div>
                        <div style={{ ...S.mono, fontSize: "13px", color: "#cbd5e1" }}>{fmtAmount(converted)} {toCur}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — Rates table */}
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Favorites */}
            <div style={S.card}>
              <div style={{ padding: "13px 16px", borderBottom: "1px solid #1e2a3a" }}>
                <span style={S.lbl}>{fromCur} vs. principales divisas</span>
              </div>
              {loading ? (
                <div style={{ padding: "20px" }}>
                  {[1,2,3,4,5].map(i => <div key={i} style={{ height: "44px", background: "#1e2a3a", borderRadius: "6px", marginBottom: "8px" }} />)}
                </div>
              ) : (
                <div>
                  {favorites.filter(c => c !== fromCur).map((code, i) => {
                    const rate = getRate(fromCur, code);
                    const info = currencyInfo(code);
                    return (
                      <div key={code} onClick={() => setToCur(code)}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: i < favorites.length - 2 ? "1px solid #111827" : "none", cursor: "pointer", background: toCur === code ? "#141e2e" : "transparent", transition: "background .15s", borderLeft: toCur === code ? "2px solid #f59e0b" : "2px solid transparent" }}
                        onMouseEnter={e => { if (toCur !== code) e.currentTarget.style.background = "#0f1520"; }}
                        onMouseLeave={e => { if (toCur !== code) e.currentTarget.style.background = "transparent"; }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span style={{ fontSize: "20px" }}>{info.flag}</span>
                          <div>
                            <div style={{ fontSize: "13px", color: "#cbd5e1", fontWeight: 500 }}>{code}</div>
                            <div style={{ fontSize: "10px", color: "#4a5568" }}>{info.name}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ ...S.mono, fontSize: "15px", color: "#e2e8f0" }}>{fmt(rate)}</div>
                          <div style={{ fontSize: "10px", color: "#334155" }}>por 1 {fromCur}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* All rates */}
            <div style={S.card}>
              <div style={{ padding: "13px 16px", borderBottom: "1px solid #1e2a3a" }}>
                <span style={S.lbl}>Todas las divisas</span>
              </div>
              <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                {loading ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "#334155", fontSize: "12px" }}>Cargando...</div>
                ) : rates && CURRENCIES.filter(c => c.code !== fromCur && rates[c.code]).map((c, i) => {
                  const rate = getRate(fromCur, c.code);
                  return (
                    <div key={c.code} onClick={() => setToCur(c.code)}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 16px", borderBottom: "1px solid #0f1520", cursor: "pointer", background: toCur === c.code ? "#141e2e" : "transparent", transition: "background .1s" }}
                      onMouseEnter={e => { if (toCur !== c.code) e.currentTarget.style.background = "#0f1520"; }}
                      onMouseLeave={e => { if (toCur !== c.code) e.currentTarget.style.background = "transparent"; }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px" }}>{c.flag}</span>
                        <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>{c.code}</span>
                        <span style={{ fontSize: "11px", color: "#334155" }}>{c.name}</span>
                      </div>
                      <div style={{ ...S.mono, fontSize: "12px", color: "#cbd5e1" }}>{fmt(rate)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
