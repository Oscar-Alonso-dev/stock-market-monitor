"""
test_crumb.py — Obtener crumb de Yahoo Finance y probar endpoints autenticados

Uso:
    cd C:\proyectos\stock-market-monitor
    python test_crumb.py
"""
import httpx, json, asyncio, re

YF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
}

async def get_crumb(client):
    """Obtiene cookie + crumb de Yahoo Finance"""
    # Paso 1: visitar la página principal para obtener cookies
    r = await client.get("https://finance.yahoo.com/", headers=YF_HEADERS)
    print(f"  Página principal: {r.status_code}, cookies: {list(r.cookies.keys())}")

    # Paso 2: obtener el crumb
    r2 = await client.get(
        "https://query1.finance.yahoo.com/v1/test/getcrumb",
        headers={**YF_HEADERS, "Accept": "text/plain"},
    )
    crumb = r2.text.strip()
    print(f"  Crumb status: {r2.status_code}, crumb: '{crumb[:20] if crumb else 'VACIO'}'")
    return crumb if r2.status_code == 200 and crumb else None

async def test():
    # Usar un cliente que mantenga cookies entre requests
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as c:

        print("=== OBTENIENDO CRUMB ===")
        crumb = await get_crumb(c)

        if not crumb:
            print("FALLO: No se pudo obtener el crumb")
            # Intentar método alternativo
            print("\n=== MÉTODO ALTERNATIVO: crumb desde página de acción ===")
            r = await c.get("https://finance.yahoo.com/quote/AAPL/", headers=YF_HEADERS)
            print(f"  Status: {r.status_code}")
            # Buscar crumb en el HTML
            match = re.search(r'"crumb":"([^"]+)"', r.text)
            if match:
                crumb = match.group(1).encode().decode('unicode_escape')
                print(f"  Crumb encontrado en HTML: '{crumb}'")
            else:
                print("  No encontrado en HTML")

        if crumb:
            print(f"\n=== TEST CON CRUMB: AAPL fundamentales ===")
            r = await c.get(
                "https://query1.finance.yahoo.com/v10/finance/quoteSummary/AAPL",
                params={"modules": "defaultKeyStatistics,summaryDetail,financialData,assetProfile", "crumb": crumb},
                headers={**YF_HEADERS, "Accept": "application/json"},
            )
            print(f"  Status: {r.status_code}")
            if r.status_code == 200:
                res = r.json().get("quoteSummary", {}).get("result", [{}])
                if res and res[0]:
                    def v(d, k): x=d.get(k); return x.get("raw") if isinstance(x,dict) else x
                    sd = res[0].get("summaryDetail", {})
                    fd = res[0].get("financialData", {})
                    ap = res[0].get("assetProfile", {})
                    ks = res[0].get("defaultKeyStatistics", {})
                    print(f"  PER: {v(sd,'trailingPE')}")
                    print(f"  P/Book: {v(ks,'priceToBook')}")
                    print(f"  EV/EBITDA: {v(ks,'enterpriseToEbitda')}")
                    print(f"  ROE: {v(fd,'returnOnEquity')}")
                    print(f"  Margen neto: {v(fd,'profitMargins')}")
                    print(f"  Sector: {ap.get('sector')}")
                    print(f"  ✓ FUNCIONA")
            else:
                print(f"  Error: {r.text[:200]}")

            print(f"\n=== TEST CON CRUMB: SAN.MC fundamentales ===")
            r = await c.get(
                "https://query1.finance.yahoo.com/v10/finance/quoteSummary/SAN.MC",
                params={"modules": "defaultKeyStatistics,summaryDetail,financialData,assetProfile", "crumb": crumb},
                headers={**YF_HEADERS, "Accept": "application/json"},
            )
            print(f"  Status: {r.status_code}")
            if r.status_code == 200:
                res = r.json().get("quoteSummary", {}).get("result", [{}])
                if res and res[0]:
                    def v(d, k): x=d.get(k); return x.get("raw") if isinstance(x,dict) else x
                    sd = res[0].get("summaryDetail", {})
                    fd = res[0].get("financialData", {})
                    print(f"  PER: {v(sd,'trailingPE')}")
                    print(f"  Dividendo: {v(sd,'dividendYield')}")
                    print(f"  ROE: {v(fd,'returnOnEquity')}")
                    print(f"  ✓ FUNCIONA")
            else:
                print(f"  Error: {r.text[:200]}")

            print(f"\n=== TEST CON CRUMB: Holdings fondo {0}P00019W2R.F ===".format(""))
            r = await c.get(
                "https://query1.finance.yahoo.com/v10/finance/quoteSummary/0P00019W2R.F",
                params={"modules": "topHoldings,fundProfile", "crumb": crumb},
                headers={**YF_HEADERS, "Accept": "application/json"},
            )
            print(f"  Status: {r.status_code}")
            if r.status_code == 200:
                res = r.json().get("quoteSummary", {}).get("result", [{}])
                if res and res[0]:
                    th = res[0].get("topHoldings", {})
                    fp = res[0].get("fundProfile", {})
                    holdings = th.get("holdings", [])
                    print(f"  Categoría: {fp.get('categoryName')}")
                    print(f"  Holdings ({len(holdings)}):")
                    for h in holdings[:5]:
                        pct = h.get("holdingPercent", {})
                        pct_v = pct.get("raw") if isinstance(pct,dict) else pct
                        print(f"    {h.get('holdingName')} — {round((pct_v or 0)*100,2)}%")
                    print(f"  ✓ FUNCIONA")
            else:
                print(f"  Error: {r.text[:200]}")

            print(f"\n=== TEST CON CRUMB: IBEX35 batch quotes ===")
            ibex = ["SAN.MC","BBVA.MC","ITX.MC","IBE.MC","REP.MC","TEF.MC","CABK.MC","ACS.MC"]
            r = await c.get(
                "https://query1.finance.yahoo.com/v7/finance/quote",
                params={"symbols": ",".join(ibex), "crumb": crumb},
                headers={**YF_HEADERS, "Accept": "application/json"},
            )
            print(f"  Status: {r.status_code}")
            if r.status_code == 200:
                quotes = r.json().get("quoteResponse", {}).get("result", [])
                print(f"  Cotizaciones: {len(quotes)}")
                for q in quotes[:4]:
                    print(f"  {q.get('symbol')}: {q.get('regularMarketPrice')} ({q.get('regularMarketChangePercent',0):.2f}%)")
                print(f"  ✓ FUNCIONA")
            else:
                print(f"  Error: {r.text[:200]}")

        print("\n=== FIN ===")

asyncio.run(test())
