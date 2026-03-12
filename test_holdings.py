"""
test_holdings.py — Probar endpoints de holdings y fundamentales

Uso:
    cd C:\proyectos\stock-market-monitor
    venv\Scripts\activate
    python test_holdings.py
"""
import httpx, json, asyncio

YF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "es-ES,es;q=0.9",
}

FUND_SYM  = "0P00019W2R.F"  # Cobas Internacional C — verificado
STOCK_SYM = "AAPL"           # Apple para probar ratios
ES_STOCK  = "SAN.MC"         # Santander mercado español

async def test():
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as c:

        # ── FONDOS: Holdings via quoteSummary v11 ────────────────────────────
        print(f"\n=== FONDO HOLDINGS v11 — {FUND_SYM} ===")
        try:
            r = await c.get(
                f"https://query1.finance.yahoo.com/v11/finance/quoteSummary/{FUND_SYM}",
                params={"modules": "topHoldings,fundProfile,defaultKeyStatistics"},
                headers=YF_HEADERS)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                res = r.json().get("quoteSummary", {}).get("result", [{}])
                if res and res[0]:
                    th = res[0].get("topHoldings", {})
                    fp = res[0].get("fundProfile", {})
                    ks = res[0].get("defaultKeyStatistics", {})
                    print(f"  Categoría: {fp.get('categoryName')}")
                    print(f"  Familia: {fp.get('family')}")
                    holdings = th.get("holdings", [])
                    print(f"  Holdings ({len(holdings)}):")
                    for h in holdings[:5]:
                        pct = h.get("holdingPercent", {})
                        pct_v = pct.get("raw") if isinstance(pct, dict) else pct
                        print(f"    {h.get('holdingName')} — {pct_v}")
                    geo = th.get("equityHoldings", {})
                    print(f"  % Acciones: {geo.get('stockPosition', {}).get('raw')}")
                    print(f"  % Bonos: {geo.get('bondPosition', {}).get('raw')}")
                else:
                    print(f"  Sin resultado")
            else:
                print(f"  Error: {r.text[:200]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── FONDOS: Holdings via v10 ─────────────────────────────────────────
        print(f"\n=== FONDO HOLDINGS v10 — {FUND_SYM} ===")
        try:
            r = await c.get(
                f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{FUND_SYM}",
                params={"modules": "topHoldings,fundProfile"},
                headers=YF_HEADERS)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                res = r.json().get("quoteSummary", {}).get("result", [{}])
                th = (res[0] or {}).get("topHoldings", {})
                holdings = th.get("holdings", [])
                print(f"  Holdings: {len(holdings)}")
                for h in holdings[:5]:
                    pct = h.get("holdingPercent", {})
                    pct_v = pct.get("raw") if isinstance(pct, dict) else pct
                    print(f"    {h.get('holdingName')} — {pct_v}")
            else:
                print(f"  Error: {r.text[:200]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── ACCIONES: Ratios fundamentales AAPL ─────────────────────────────
        print(f"\n=== ACCIÓN FUNDAMENTALES — {STOCK_SYM} ===")
        try:
            r = await c.get(
                f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{STOCK_SYM}",
                params={"modules": "defaultKeyStatistics,summaryDetail,financialData,assetProfile"},
                headers=YF_HEADERS)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                res = r.json().get("quoteSummary", {}).get("result", [{}])
                if res and res[0]:
                    ks = res[0].get("defaultKeyStatistics", {})
                    sd = res[0].get("summaryDetail", {})
                    fd = res[0].get("financialData", {})
                    ap = res[0].get("assetProfile", {})
                    def v(d, k): x=d.get(k); return x.get("raw") if isinstance(x,dict) else x
                    print(f"  PER: {v(sd,'trailingPE')}")
                    print(f"  Forward PER: {v(sd,'forwardPE')}")
                    print(f"  PEG: {v(ks,'pegRatio')}")
                    print(f"  P/Book: {v(ks,'priceToBook')}")
                    print(f"  EV/EBITDA: {v(ks,'enterpriseToEbitda')}")
                    print(f"  EV/Revenue: {v(ks,'enterpriseToRevenue')}")
                    print(f"  ROE: {v(fd,'returnOnEquity')}")
                    print(f"  ROA: {v(fd,'returnOnAssets')}")
                    print(f"  Margen neto: {v(fd,'profitMargins')}")
                    print(f"  Dividendo: {v(sd,'dividendYield')}")
                    print(f"  Beta: {v(sd,'beta')}")
                    print(f"  Market cap: {v(sd,'marketCap')}")
                    print(f"  Sector: {ap.get('sector')}")
                    print(f"  Industria: {ap.get('industry')}")
                    print(f"  Descripción (100c): {(ap.get('longBusinessSummary') or '')[:100]}")
            else:
                print(f"  Error: {r.text[:200]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── ACCIONES ESPAÑOLAS: Santander ────────────────────────────────────
        print(f"\n=== ACCIÓN ESPAÑOLA — {ES_STOCK} ===")
        try:
            r = await c.get(
                f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{ES_STOCK}",
                params={"modules": "defaultKeyStatistics,summaryDetail,financialData,assetProfile"},
                headers=YF_HEADERS)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                res = r.json().get("quoteSummary", {}).get("result", [{}])
                if res and res[0]:
                    ks = res[0].get("defaultKeyStatistics", {})
                    sd = res[0].get("summaryDetail", {})
                    fd = res[0].get("financialData", {})
                    ap = res[0].get("assetProfile", {})
                    def v(d, k): x=d.get(k); return x.get("raw") if isinstance(x,dict) else x
                    print(f"  PER: {v(sd,'trailingPE')}")
                    print(f"  P/Book: {v(ks,'priceToBook')}")
                    print(f"  ROE: {v(fd,'returnOnEquity')}")
                    print(f"  Dividendo: {v(sd,'dividendYield')}")
                    print(f"  Market cap: {v(sd,'marketCap')}")
                    print(f"  Sector: {ap.get('sector')}")
                else:
                    print(f"  Sin resultado")
            else:
                print(f"  Error: {r.text[:200]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── IBEX35: Batch quotes ─────────────────────────────────────────────
        print(f"\n=== IBEX35 BATCH QUOTES ===")
        ibex = ["SAN.MC","BBVA.MC","ITX.MC","IBE.MC","REP.MC","TEF.MC","CABK.MC","AMS.MC","FER.MC","ACS.MC"]
        try:
            syms = ",".join(ibex)
            r = await c.get(
                f"https://query1.finance.yahoo.com/v7/finance/quote",
                params={"symbols": syms},
                headers=YF_HEADERS)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                quotes = r.json().get("quoteResponse", {}).get("result", [])
                print(f"  Cotizaciones recibidas: {len(quotes)}")
                for q in quotes[:5]:
                    print(f"  {q.get('symbol')}: {q.get('regularMarketPrice')} ({q.get('regularMarketChangePercent',0):.2f}%)")
            else:
                print(f"  Error: {r.text[:200]}")
        except Exception as e:
            print(f"ERROR: {e}")

        print("\n=== FIN ===")

asyncio.run(test())
