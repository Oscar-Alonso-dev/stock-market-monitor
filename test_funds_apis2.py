"""
test_funds_apis2.py — Segunda fase: probar Morningstar NAV con IDs reales

Uso:
    cd C:\proyectos\stock-market-monitor
    venv\Scripts\activate
    python test_funds_apis2.py
"""
import httpx, json, asyncio

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "es-ES,es;q=0.9",
}
MSTAR_HEADERS = {
    **HEADERS,
    "Referer": "https://www.morningstar.es/",
    "Origin":  "https://www.morningstar.es",
}

async def test():
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as c:

        # IDs reales de Cobas Internacional C (del test anterior)
        MSTAR_ID = "F00000WQPW"   # Morningstar Fund ID
        PERF_ID  = "0P00019W2R"   # Performance ID (sin .F)
        YF_SYM   = "0P00019W2R.F" # Yahoo Finance symbol

        # ── TEST A: Yahoo Finance chart con símbolo real de búsqueda ─────────
        print(f"\n=== TEST A: Yahoo chart con {YF_SYM} ===")
        try:
            r = await c.get(f"https://query1.finance.yahoo.com/v8/finance/chart/{YF_SYM}",
                params={"interval": "1d", "range": "1mo"}, headers=HEADERS)
            print(f"Status: {r.status_code}")
            res = r.json().get("chart", {}).get("result", [])
            if res:
                meta = res[0].get("meta", {})
                pts  = res[0].get("timestamp", [])
                print(f"Nombre: {meta.get('longName') or meta.get('shortName')}")
                print(f"NAV: {meta.get('regularMarketPrice')}")
                print(f"Puntos: {len(pts)}")
            else:
                err = r.json().get("chart", {}).get("error", {})
                print(f"Error: {err}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST B: Morningstar performance data ─────────────────────────────
        print(f"\n=== TEST B: Morningstar performance — {PERF_ID} ===")
        try:
            r = await c.get(
                f"https://www.morningstar.es/es/funds/snapshot/snapshot.aspx",
                params={"id": MSTAR_ID, "tab": "1"},
                headers=MSTAR_HEADERS)
            print(f"Status: {r.status_code}")
            has_nav = "VL" in r.text or "NAV" in r.text or "valor" in r.text.lower()
            print(f"Contiene datos NAV: {has_nav}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST C: Morningstar API chart ─────────────────────────────────────
        print(f"\n=== TEST C: Morningstar chart API — {PERF_ID} ===")
        for url in [
            f"https://www.morningstar.es/es/util/chart.ashx?id={PERF_ID}&type=nav&startDate=2024-01-01&endDate=2025-01-01&currencyId=EUR",
            f"https://tools.morningstar.es/api/rest.svc/timeseries_price/be3biuvya4?id={PERF_ID}%5D2%5D1%5DEUR&currencyId=EUR&idtype=Morningstar&frequency=daily&startDate=2024-01-01&endDate=2025-06-01&outputType=JSON",
        ]:
            try:
                r = await c.get(url, headers=MSTAR_HEADERS)
                print(f"  URL: {url[:80]}...")
                print(f"  Status: {r.status_code}")
                if r.status_code == 200:
                    print(f"  Respuesta: {r.text[:200]}")
            except Exception as e:
                print(f"  ERROR: {e}")

        # ── TEST D: Morningstar quote data ────────────────────────────────────
        print(f"\n=== TEST D: Morningstar quote realtime ===")
        try:
            r = await c.get(
                f"https://www.morningstar.es/es/util/SecuritySearch.ashx",
                params={"q": "azValor Internacional", "limit": 3,
                        "investmentTyp": "", "universeIds": "FOESP$$ALL"},
                headers=MSTAR_HEADERS)
            print(f"Status: {r.status_code}")
            # Parsear los IDs
            lines = r.text.strip().split("\n")
            for line in lines[:3]:
                parts = line.split("|")
                if len(parts) >= 2:
                    try:
                        meta = json.loads(parts[1])
                        print(f"  Nombre: {parts[0].strip()}")
                        print(f"  ID: {meta.get('i')} | PI: {meta.get('pi')}")
                    except: pass
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST E: Yahoo quoteSummary para fondos ────────────────────────────
        print(f"\n=== TEST E: Yahoo quoteSummary — {YF_SYM} ===")
        try:
            r = await c.get(
                f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{YF_SYM}",
                params={"modules": "summaryDetail,defaultKeyStatistics,fundProfile,topHoldings"},
                headers=HEADERS)
            print(f"Status: {r.status_code}")
            if r.status_code == 200:
                res = r.json().get("quoteSummary", {}).get("result", [{}])
                if res and res[0]:
                    sd = res[0].get("summaryDetail", {})
                    fp = res[0].get("fundProfile", {})
                    ks = res[0].get("defaultKeyStatistics", {})
                    th = res[0].get("topHoldings", {})
                    print(f"  Categoría: {fp.get('categoryName')}")
                    print(f"  Familia: {fp.get('family')}")
                    print(f"  TER: {sd.get('expenseRatio', {}).get('raw')}")
                    print(f"  Total assets: {ks.get('totalAssets', {}).get('raw')}")
                    holdings = th.get("holdings", [])
                    print(f"  Top holdings ({len(holdings)}): {[h.get('holdingName') for h in holdings[:3]]}")
        except Exception as e:
            print(f"ERROR: {e}")

        # ── TEST F: Yahoo Finance 3 años histórico ────────────────────────────
        print(f"\n=== TEST F: Yahoo chart 3 años — {YF_SYM} ===")
        try:
            r = await c.get(f"https://query1.finance.yahoo.com/v8/finance/chart/{YF_SYM}",
                params={"interval": "1d", "range": "3y"}, headers=HEADERS)
            print(f"Status: {r.status_code}")
            res = r.json().get("chart", {}).get("result", [])
            if res:
                pts = res[0].get("timestamp", [])
                cls = res[0].get("indicators", {}).get("quote", [{}])[0].get("close", [])
                valid = [p for p in cls if p]
                print(f"Puntos totales: {len(pts)}, NAVs válidos: {len(valid)}")
                if valid:
                    print(f"Primero: {valid[0]:.4f}, Último: {valid[-1]:.4f}")
        except Exception as e:
            print(f"ERROR: {e}")

        print("\n=== FIN TESTS 2 ===")

asyncio.run(test())
