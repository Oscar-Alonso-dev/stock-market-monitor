"""
test_alternatives.py — Probar fuentes alternativas para fundamentales y batch quotes

Uso:
    cd C:\proyectos\stock-market-monitor
    python test_alternatives.py
"""
import httpx, json, asyncio

YF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
}

async def test():
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as c:

        # ── TEST 1: Open Figi / FMP (Financial Modeling Prep) free tier ──────
        print("\n=== TEST 1: FMP fundamentales AAPL (free, sin key) ===")
        try:
            r = await c.get("https://financialmodelingprep.com/api/v3/profile/AAPL",
                params={"apikey": "demo"}, headers=YF_HEADERS)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                d = r.json()
                if isinstance(d, list) and d:
                    print(f"  Nombre: {d[0].get('companyName')}")
                    print(f"  Sector: {d[0].get('sector')}")
                    print(f"  Market cap: {d[0].get('mktCap')}")
                    print(f"  Beta: {d[0].get('beta')}")
                    print(f"  Precio: {d[0].get('price')}")
                    print(f"  Descripción (80c): {str(d[0].get('description',''))[:80]}")
                    print("  ✓ FUNCIONA")
                else:
                    print(f"  Respuesta: {str(d)[:200]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 2: FMP ratios ────────────────────────────────────────────────
        print("\n=== TEST 2: FMP ratios AAPL ===")
        try:
            r = await c.get("https://financialmodelingprep.com/api/v3/ratios-ttm/AAPL",
                params={"apikey": "demo"}, headers=YF_HEADERS)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                d = r.json()
                if isinstance(d, list) and d:
                    print(f"  PER: {d[0].get('peRatioTTM')}")
                    print(f"  P/Book: {d[0].get('priceToBookRatioTTM')}")
                    print(f"  EV/EBITDA: {d[0].get('enterpriseValueOverEBITDATTM')}")
                    print(f"  ROE: {d[0].get('returnOnEquityTTM')}")
                    print(f"  Margen neto: {d[0].get('netProfitMarginTTM')}")
                    print(f"  Dividendo yield: {d[0].get('dividendYielTTM')}")
                    print("  ✓ FUNCIONA")
                else:
                    print(f"  Respuesta: {str(d)[:200]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 3: FMP empresa española SAN ─────────────────────────────────
        print("\n=== TEST 3: FMP perfil SAN (Santander) ===")
        try:
            r = await c.get("https://financialmodelingprep.com/api/v3/profile/SAN",
                params={"apikey": "demo"}, headers=YF_HEADERS)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                d = r.json()
                if isinstance(d, list) and d:
                    print(f"  Nombre: {d[0].get('companyName')}")
                    print(f"  PER: {d[0].get('pe')}")
                    print(f"  Sector: {d[0].get('sector')}")
                    print("  ✓ FUNCIONA")
                else:
                    print(f"  Respuesta: {str(d)[:200]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 4: Yahoo chart v8 SAN.MC (sin crumb, ya sabemos que funciona)
        print("\n=== TEST 4: Yahoo chart SAN.MC (referencia) ===")
        try:
            r = await c.get("https://query1.finance.yahoo.com/v8/finance/chart/SAN.MC",
                params={"interval": "1d", "range": "5d"}, headers=YF_HEADERS)
            print(f"Status: {r.status_code}")
            res = r.json().get("chart", {}).get("result", [])
            if res:
                meta = res[0].get("meta", {})
                print(f"  Precio: {meta.get('regularMarketPrice')}")
                print(f"  Nombre: {meta.get('longName') or meta.get('shortName')}")
                print("  ✓ FUNCIONA")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 5: Alphavantage free (sin key, demo) ─────────────────────────
        print("\n=== TEST 5: AlphaVantage overview AAPL (demo) ===")
        try:
            r = await c.get("https://www.alphavantage.co/query",
                params={"function": "OVERVIEW", "symbol": "AAPL", "apikey": "demo"},
                headers=YF_HEADERS)
            print(f"Status: {r.status_code}")
            d = r.json()
            if d.get("Symbol"):
                print(f"  Sector: {d.get('Sector')}")
                print(f"  PER: {d.get('PERatio')}")
                print(f"  EV/EBITDA: {d.get('EVToEBITDA')}")
                print(f"  ROE: {d.get('ReturnOnEquityTTM')}")
                print(f"  Dividendo: {d.get('DividendYield')}")
                print("  ✓ FUNCIONA")
            else:
                print(f"  Respuesta: {str(d)[:200]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 6: Yahoo v8 quoteSummary con cookie manual ──────────────────
        print("\n=== TEST 6: Yahoo quoteSummary con cookie A3 manual ===")
        try:
            r = await c.get(
                "https://query2.finance.yahoo.com/v10/finance/quoteSummary/AAPL",
                params={"modules": "summaryDetail,defaultKeyStatistics"},
                headers={
                    **YF_HEADERS,
                    "Cookie": "A3=d=AQABBPxxxxxx; Y=v=1&n=xxxx",
                },
            )
            print(f"Status: {r.status_code} (esperado 401 — solo confirmamos)")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 7: Styvio / simplywall / macrotrends ─────────────────────────
        print("\n=== TEST 7: Macrotrends scrape AAPL PE ratio ===")
        try:
            r = await c.get(
                "https://www.macrotrends.net/assets/php/fundamental_iframe.php",
                params={"t": "AAPL", "type": "pe-ratio", "statement": "price-ratios", "frequency": "A"},
                headers=YF_HEADERS, timeout=10.0)
            print(f"Status: {r.status_code}")
            has_data = "pe" in r.text.lower() or "ratio" in r.text.lower()
            print(f"  Tiene datos PE: {has_data}")
            print(f"  Primeros 200c: {r.text[:200]}")
        except Exception as e:
            print(f"ERROR: {e}")

        print("\n=== FIN ===")

asyncio.run(test())
