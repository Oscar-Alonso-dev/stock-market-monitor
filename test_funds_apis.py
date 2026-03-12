"""
test_funds_apis.py — Ejecuta esto en tu máquina para diagnosticar qué APIs funcionan.

Uso:
    cd C:\proyectos\stock-market-monitor
    venv\Scripts\activate
    python test_funds_apis.py
"""
import httpx, json, asyncio

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "es-ES,es;q=0.9",
}

async def test():
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as c:

        # ── TEST 1: Yahoo Finance — búsqueda ─────────────────────────────────
        print("\n=== TEST 1: Yahoo Finance search — Cobas Internacional ===")
        try:
            r = await c.get("https://query1.finance.yahoo.com/v1/finance/search",
                params={"q": "Cobas Internacional", "quotesCount": 5, "newsCount": 0},
                headers=HEADERS)
            print(f"Status: {r.status_code}")
            quotes = r.json().get("quotes", [])
            print(f"Resultados: {len(quotes)}")
            for q in quotes[:4]:
                print(f"  [{q.get('quoteType')}] {q.get('symbol')} | {q.get('longname') or q.get('shortname')}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 2: Yahoo Finance — chart fondo Bestinver ────────────────────
        print("\n=== TEST 2: Yahoo Finance chart — 0P0000QS5L.F (Bestinver) ===")
        try:
            r = await c.get("https://query1.finance.yahoo.com/v8/finance/chart/0P0000QS5L.F",
                params={"interval": "1d", "range": "1mo"},
                headers=HEADERS)
            print(f"Status: {r.status_code}")
            res = r.json().get("chart", {}).get("result", [])
            if res:
                meta = res[0].get("meta", {})
                pts  = res[0].get("timestamp", [])
                print(f"Nombre: {meta.get('longName') or meta.get('shortName')}")
                print(f"NAV actual: {meta.get('regularMarketPrice')}")
                print(f"Puntos históricos: {len(pts)}")
            else:
                print(f"Sin resultado. Error: {r.json().get('chart', {}).get('error')}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 3: Yahoo Finance — ISIN directo ─────────────────────────────
        print("\n=== TEST 3: Yahoo Finance search — ISIN ES0169107098 (Cobas) ===")
        try:
            r = await c.get("https://query1.finance.yahoo.com/v1/finance/search",
                params={"q": "ES0169107098", "quotesCount": 5, "newsCount": 0},
                headers=HEADERS)
            print(f"Status: {r.status_code}")
            quotes = r.json().get("quotes", [])
            for q in quotes[:4]:
                print(f"  [{q.get('quoteType')}] {q.get('symbol')} | {q.get('longname') or q.get('shortname')}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 4: Morningstar España — búsqueda ────────────────────────────
        print("\n=== TEST 4: Morningstar.es search — Cobas ===")
        try:
            r = await c.get("https://www.morningstar.es/es/util/SecuritySearch.ashx",
                params={"q": "Cobas", "limit": 5, "investmentTyp": "", "universeIds": "FOESP$$ALL"},
                headers={**HEADERS, "Referer": "https://www.morningstar.es/"})
            print(f"Status: {r.status_code}")
            text = r.text[:500]
            print(f"Respuesta: {text}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 5: Morningstar — screener API ───────────────────────────────
        print("\n=== TEST 5: Morningstar screener API ===")
        try:
            r = await c.get("https://lt.morningstar.com/api/rest.svc/klr5zyak8x/security/screener",
                params={"page": 1, "pageSize": 5, "sortOrder": "LegalName asc",
                        "outputType": "json", "version": 1,
                        "languageId": "es-ES", "currencyId": "EUR",
                        "universeIds": "FOESP$$ALL", "term": "Cobas"},
                headers={**HEADERS, "Referer": "https://www.morningstar.es/"})
            print(f"Status: {r.status_code}")
            print(f"Respuesta: {r.text[:500]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 6: Morningstar — NAV histórico por ID ───────────────────────
        print("\n=== TEST 6: Morningstar NAV histórico — F00000WQPW (Cobas Intl) ===")
        try:
            r = await c.get("https://www.morningstar.es/es/funds/snapshot/snapshot.aspx",
                params={"id": "F00000WQPW"},
                headers={**HEADERS, "Referer": "https://www.morningstar.es/"})
            print(f"Status: {r.status_code}")
            print(f"Título página: {'Cobas' in r.text or 'cobas' in r.text.lower()}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 7: Morningstar — NAV API directa ────────────────────────────
        print("\n=== TEST 7: Morningstar NAV API directa ===")
        try:
            r = await c.get(
                "https://api.morningstar.com/v2/security/historical/nav",
                params={"id": "F00000WQPW", "currencyId": "EUR", "idType": "Morningstar",
                        "frequency": "daily", "startDate": "2024-01-01", "outputType": "JSON"},
                headers={**HEADERS, "Referer": "https://www.morningstar.es/"})
            print(f"Status: {r.status_code}")
            print(f"Respuesta: {r.text[:300]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST 8: Finect ───────────────────────────────────────────────────
        print("\n=== TEST 8: Finect búsqueda ===")
        try:
            r = await c.get("https://www.finect.com/fondos-de-inversion/buscar/",
                params={"q": "Cobas Internacional"},
                headers=HEADERS)
            print(f"Status: {r.status_code}")
            print(f"Tiene datos JSON: {'application/json' in r.headers.get('content-type','')}")
            print(f"Primeros 300 chars: {r.text[:300]}")
        except Exception as e:
            print(f"ERROR: {e}")

        print("\n=== FIN DE TESTS ===")

asyncio.run(test())
