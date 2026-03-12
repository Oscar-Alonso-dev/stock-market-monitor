import httpx, asyncio, json

KEY = "hsAsc6Yt9nIwlYTAW1AUOBX7U6MQUNOL"
BASE = "https://financialmodelingprep.com/api"

async def test():
    async with httpx.AsyncClient(timeout=15.0) as c:

        print("=== TEST 1: PERFIL EMPRESA (AAPL) ===")
        r = await c.get(f"{BASE}/v3/profile/AAPL", params={"apikey": KEY})
        print(f"Status: {r.status_code}")
        d = r.json()
        if isinstance(d, list) and d:
            p = d[0]
            print(f"  Nombre: {p.get('companyName')}")
            print(f"  Sector: {p.get('sector')}")
            print(f"  PER: {p.get('pe')}")
            print(f"  Market cap: {p.get('mktCap')}")
            print(f"  Beta: {p.get('beta')}")
            print(f"  Dividendo: {p.get('lastDiv')}")
            print(f"  Descripción: {str(p.get('description',''))[:100]}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        print("\n=== TEST 2: RATIOS TTM (AAPL) ===")
        r = await c.get(f"{BASE}/v3/ratios-ttm/AAPL", params={"apikey": KEY})
        print(f"Status: {r.status_code}")
        d = r.json()
        if isinstance(d, list) and d:
            p = d[0]
            print(f"  PER: {p.get('peRatioTTM')}")
            print(f"  P/Book: {p.get('priceToBookRatioTTM')}")
            print(f"  EV/EBITDA: {p.get('enterpriseValueOverEBITDATTM')}")
            print(f"  ROE: {p.get('returnOnEquityTTM')}")
            print(f"  ROA: {p.get('returnOnAssetsTTM')}")
            print(f"  Margen neto: {p.get('netProfitMarginTTM')}")
            print(f"  Dividendo yield: {p.get('dividendYielTTM')}")
            print(f"  Deuda/Equity: {p.get('debtEquityRatioTTM')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        print("\n=== TEST 3: KEY METRICS TTM (AAPL) ===")
        r = await c.get(f"{BASE}/v3/key-metrics-ttm/AAPL", params={"apikey": KEY})
        print(f"Status: {r.status_code}")
        d = r.json()
        if isinstance(d, list) and d:
            p = d[0]
            print(f"  EV: {p.get('enterpriseValueTTM')}")
            print(f"  EV/EBITDA: {p.get('evToEbitdaTTM')}")
            print(f"  P/FCF: {p.get('priceToFreeCashFlowTTM')}")
            print(f"  FCF/share: {p.get('freeCashFlowPerShareTTM')}")
            print(f"  Deuda neta: {p.get('netDebtTTM')}")
            print(f"  ROIC: {p.get('roicTTM')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        print("\n=== TEST 4: INCOME STATEMENT AAPL ===")
        r = await c.get(f"{BASE}/v3/income-statement/AAPL",
            params={"apikey": KEY, "limit": 4, "period": "annual"})
        print(f"Status: {r.status_code}")
        d = r.json()
        if isinstance(d, list) and d:
            p = d[0]
            print(f"  Año: {p.get('date')}")
            print(f"  Revenue: {p.get('revenue')}")
            print(f"  Gross profit: {p.get('grossProfit')}")
            print(f"  EBITDA: {p.get('ebitda')}")
            print(f"  Net income: {p.get('netIncome')}")
            print(f"  EPS: {p.get('eps')}")
            print(f"  Años disponibles: {len(d)}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        print("\n=== TEST 5: BALANCE SHEET AAPL ===")
        r = await c.get(f"{BASE}/v3/balance-sheet-statement/AAPL",
            params={"apikey": KEY, "limit": 4, "period": "annual"})
        print(f"Status: {r.status_code}")
        d = r.json()
        if isinstance(d, list) and d:
            p = d[0]
            print(f"  Fecha: {p.get('date')}")
            print(f"  Total activos: {p.get('totalAssets')}")
            print(f"  Deuda total: {p.get('totalDebt')}")
            print(f"  Cash: {p.get('cashAndCashEquivalents')}")
            print(f"  Patrimonio neto: {p.get('totalStockholdersEquity')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        print("\n=== TEST 6: CASH FLOW AAPL ===")
        r = await c.get(f"{BASE}/v3/cash-flow-statement/AAPL",
            params={"apikey": KEY, "limit": 4, "period": "annual"})
        print(f"Status: {r.status_code}")
        d = r.json()
        if isinstance(d, list) and d:
            p = d[0]
            print(f"  FCF: {p.get('freeCashFlow')}")
            print(f"  Capex: {p.get('capitalExpenditure')}")
            print(f"  Dividendos pagados: {p.get('dividendsPaid')}")
            print(f"  Recompra acciones: {p.get('commonStockRepurchased')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        print("\n=== TEST 7: EARNINGS / EPS histórico ===")
        r = await c.get(f"{BASE}/v3/historical/earning_calendar/AAPL",
            params={"apikey": KEY, "limit": 8})
        print(f"Status: {r.status_code}")
        d = r.json()
        if isinstance(d, list) and d:
            for q in d[:3]:
                print(f"  {q.get('date')}: EPS actual={q.get('eps')} estimado={q.get('epsEstimated')} sorpresa={q.get('epsDifference')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        print("\n=== TEST 8: INSIDER TRADES ===")
        r = await c.get(f"{BASE}/v4/insider-trading",
            params={"apikey": KEY, "symbol": "AAPL", "limit": 5})
        print(f"Status: {r.status_code}")
        d = r.json()
        if isinstance(d, list) and d:
            for t in d[:3]:
                print(f"  {t.get('reportingName')}: {t.get('transactionType')} {t.get('securitiesTransacted')} acc @ ${t.get('price')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        print("\n=== TEST 9: EMPRESA ESPAÑOLA — SAN ===")
        r = await c.get(f"{BASE}/v3/profile/SAN", params={"apikey": KEY})
        print(f"Status: {r.status_code}")
        d = r.json()
        if isinstance(d, list) and d:
            p = d[0]
            print(f"  Nombre: {p.get('companyName')}")
            print(f"  PER: {p.get('pe')}")
            print(f"  Market cap: {p.get('mktCap')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        print("\n=== TEST 10: ANALYST ESTIMATES ===")
        r = await c.get(f"{BASE}/v3/analyst-estimates/AAPL",
            params={"apikey": KEY, "limit": 4})
        print(f"Status: {r.status_code}")
        d = r.json()
        if isinstance(d, list) and d:
            p = d[0]
            print(f"  Fecha: {p.get('date')}")
            print(f"  Revenue estimado: {p.get('estimatedRevenueAvg')}")
            print(f"  EPS estimado: {p.get('estimatedEpsAvg')}")
            print("  ✓ FUNCIONA")
        else:
            print(f"  Respuesta: {str(d)[:200]}")

        print("\n=== FIN ===")

asyncio.run(test())
