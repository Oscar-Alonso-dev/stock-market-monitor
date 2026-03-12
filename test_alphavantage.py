"""
test_alphavantage.py — Probar endpoints de AlphaVantage con key real

Uso:
    cd C:\proyectos\stock-market-monitor
    python test_alphavantage.py
"""
import httpx, asyncio

KEY = "VU2TZROH46NR6L2Q"
BASE = "https://www.alphavantage.co/query"

async def test():
    async with httpx.AsyncClient(timeout=20.0) as c:

        # ── TEST 1: OVERVIEW — fundamentales AAPL ────────────────────────────
        print("\n=== TEST 1: OVERVIEW AAPL ===")
        r = await c.get(BASE, params={"function":"OVERVIEW","symbol":"AAPL","apikey":KEY})
        print(f"Status: {r.status_code}")
        d = r.json()
        if d.get("Symbol"):
            print(f"  Nombre: {d.get('Name')}")
            print(f"  Sector: {d.get('Sector')}")
            print(f"  Industria: {d.get('Industry')}")
            print(f"  Market cap: {d.get('MarketCapitalization')}")
            print(f"  PER: {d.get('PERatio')}")
            print(f"  PEG: {d.get('PEGRatio')}")
            print(f"  P/Book: {d.get('PriceToBookRatio')}")
            print(f"  EV/EBITDA: {d.get('EVToEBITDA')}")
            print(f"  ROE: {d.get('ReturnOnEquityTTM')}")
            print(f"  ROA: {d.get('ReturnOnAssetsTTM')}")
            print(f"  Margen neto: {d.get('ProfitMargin')}")
            print(f"  Dividendo: {d.get('DividendYield')}")
            print(f"  Beta: {d.get('Beta')}")
            print(f"  52w high: {d.get('52WeekHigh')}")
            print(f"  52w low: {d.get('52WeekLow')}")
            print(f"  Descripción: {str(d.get('Description',''))[:100]}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:300]}")

        # ── TEST 2: OVERVIEW empresa española — SAN ──────────────────────────
        print("\n=== TEST 2: OVERVIEW SAN (Santander NYSE) ===")
        r = await c.get(BASE, params={"function":"OVERVIEW","symbol":"SAN","apikey":KEY})
        d = r.json()
        if d.get("Symbol"):
            print(f"  Nombre: {d.get('Name')}")
            print(f"  PER: {d.get('PERatio')}")
            print(f"  Sector: {d.get('Sector')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        # ── TEST 3: GLOBAL_QUOTE — precio en tiempo real ──────────────────────
        print("\n=== TEST 3: GLOBAL_QUOTE AAPL ===")
        r = await c.get(BASE, params={"function":"GLOBAL_QUOTE","symbol":"AAPL","apikey":KEY})
        d = r.json()
        gq = d.get("Global Quote", {})
        if gq.get("05. price"):
            print(f"  Precio: {gq.get('05. price')}")
            print(f"  Cambio: {gq.get('09. change')}")
            print(f"  Cambio %: {gq.get('10. change percent')}")
            print(f"  Volumen: {gq.get('06. volume')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        # ── TEST 4: SYMBOL_SEARCH — buscar acciones ───────────────────────────
        print("\n=== TEST 4: SYMBOL_SEARCH 'Santander' ===")
        r = await c.get(BASE, params={"function":"SYMBOL_SEARCH","keywords":"Santander","apikey":KEY})
        d = r.json()
        matches = d.get("bestMatches", [])
        print(f"  Resultados: {len(matches)}")
        for m in matches[:4]:
            print(f"  {m.get('1. symbol')} | {m.get('2. name')} | {m.get('4. region')}")
        if matches:
            print("  ✓ FUNCIONA")

        # ── TEST 5: INCOME_STATEMENT — para calcular márgenes ────────────────
        print("\n=== TEST 5: INCOME_STATEMENT AAPL ===")
        r = await c.get(BASE, params={"function":"INCOME_STATEMENT","symbol":"AAPL","apikey":KEY})
        d = r.json()
        reports = d.get("annualReports", [])
        print(f"  Reportes anuales: {len(reports)}")
        if reports:
            latest = reports[0]
            print(f"  Año: {latest.get('fiscalDateEnding')}")
            print(f"  Revenue: {latest.get('totalRevenue')}")
            print(f"  Net income: {latest.get('netIncome')}")
            print(f"  EBITDA: {latest.get('ebitda')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        # ── TEST 6: límite de peticiones ──────────────────────────────────────
        print("\n=== TEST 6: OVERVIEW MSFT (verificar límite) ===")
        r = await c.get(BASE, params={"function":"OVERVIEW","symbol":"MSFT","apikey":KEY})
        d = r.json()
        if d.get("Note") or d.get("Information"):
            print(f"  ⚠ Límite: {d.get('Note') or d.get('Information')}")
        elif d.get("Symbol"):
            print(f"  PER MSFT: {d.get('PERatio')} ✓")

        print("\n=== FIN ===")

asyncio.run(test())
