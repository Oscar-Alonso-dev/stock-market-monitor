import { useState } from 'react';
import StockDashboard from './StockDashboard';
import Portfolio from './Portfolio';
import Home from './Home';
import Funds from './Funds';
import Market from './Market';
import Currency from './Currency';

function App() {
  const [view, setView] = useState<'home' | 'dashboard' | 'market' | 'portfolio' | 'funds' | 'currency'>('home');
  const [analyzeSymbol, setAnalyzeSymbol] = useState<string | null>(null);

  const handleAnalyze = (symbol: string) => {
    setAnalyzeSymbol(symbol);
    setView('dashboard');
  };

  const handleNavigate = (v: string) => setView(v as any);

  const NAV = [
    { key: 'home',      label: 'Inicio'      },
    { key: 'market',    label: 'Mercado'     },
    { key: 'dashboard', label: 'Análisis'    },
    { key: 'funds',     label: 'Fondos'      },
    { key: 'portfolio', label: 'Portfolio'   },
    { key: 'currency',  label: 'Divisas'     },
  ];

  return (
    <div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0b0f18; }
        ::-webkit-scrollbar-thumb { background: #1e2a3a; border-radius: 2px; }
        body { background: #0b0f18; font-family: 'Inter', sans-serif; }
        input::placeholder { color: #2a3a50; }
        input:focus { outline: none; }
        select { appearance: none; }
        a { text-decoration: none; }
        button { cursor: pointer; }
        option { background: #111827; }
      `}</style>

      <nav style={{
        background: "#0b0f18",
        borderBottom: "1px solid #151e2d",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        height: "50px",
        position: "sticky",
        top: 0,
        zIndex: 300,
      }}>
        {/* Logo */}
        <div onClick={() => setView('home')} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", marginRight: "24px" }}>
          <div style={{ width: "30px", height: "30px", background: "linear-gradient(135deg, #f59e0b, #b45309)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "11px", fontWeight: 500, color: "#000" }}>AU</span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "14px", fontWeight: 500, color: "#e2e8f0", letterSpacing: "0.08em" }}>AURUM</span>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", height: "100%" }}>
          {NAV.map(v => (
            <button key={v.key} onClick={() => setView(v.key as any)} style={{
              background: "transparent", border: "none",
              borderBottom: view === v.key ? "2px solid #f59e0b" : "2px solid transparent",
              padding: "0 16px",
              color: view === v.key ? "#e2e8f0" : "#4a5568",
              fontSize: "13px", fontFamily: "'Inter', sans-serif",
              fontWeight: view === v.key ? 600 : 400,
              transition: "all .15s", height: "100%",
            }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Live indicator */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", animation: "blink 2s infinite" }} />
          <span style={{ fontFamily: "'JetBrains Mono'", fontSize: "10px", color: "#2d3748", letterSpacing: "0.1em" }}>LIVE · 30s</span>
        </div>
      </nav>

      {view === 'home'      && <Home onNavigate={handleNavigate} />}
      {view === 'market'    && <Market onAnalyze={handleAnalyze} />}
      {view === 'dashboard' && <StockDashboard initialSymbol={analyzeSymbol} />}
      {view === 'funds'     && <Funds />}
      {view === 'portfolio' && <Portfolio />}
      {view === 'currency'  && <Currency />}
    </div>
  );
}

export default App;
