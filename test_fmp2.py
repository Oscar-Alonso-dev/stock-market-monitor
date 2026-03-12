"""
test_fmp2.py — Probar nuevos endpoints FMP (post agosto 2025)

Uso:
    cd C:\proyectos\stock-market-monitor
    python test_fmp2.py
"""
import httpx, asyncio

KEY  = "hsAsc6Yt9nIwlYTAW1AUOBX7U6MQUNOL"
BASE = "https://financialmodelingprep.com/api"
STABLE = "https://financialmodelingprep.com/stable"

async def get(c, url, params={}):
    r = await c.get(url, params={"apikey": KEY, **params})
    return r.status_code, r.json()

async def test():
    async with httpx.AsyncClient(timeout=15.0) as c:

        # ── NUEVOS endpoints "stable" ────────────────────────────────────────
        tests = [
            ("Perfil empresa (stable)",       f"{STABLE}/profile",            {"symbol": "AAPL"}),
            ("Income statement (stable)",     f"{STABLE}/income-statement",   {"symbol": "AAPL", "limit": 4}),
            ("Balance sheet (stable)",        f"{STABLE}/balance-sheet",      {"symbol": "AAPL", "limit": 4}),
            ("Cash flow (stable)",            f"{STABLE}/cash-flow-statement",{"symbol": "AAPL", "limit": 4}),
            ("Ratios (stable)",               f"{STABLE}/ratios",             {"symbol": "AAPL", "limit": 4}),
            ("Key metrics (stable)",          f"{STABLE}/key-metrics",        {"symbol": "AAPL", "limit": 4}),
            ("Quote (stable)",                f"{STABLE}/quote",              {"symbol": "AAPL"}),
            ("Peers (stable)",                f"{STABLE}/stock-peers",        {"symbol": "AAPL"}),
            ("Insider trades (stable)",       f"{STABLE}/insider-trading",    {"symbol": "AAPL", "limit": 5}),
            ("Analyst estimates (stable)",    f"{STABLE}/analyst-estimates",  {"symbol": "AAPL", "limit": 4}),
            ("Earnings surprises (stable)",   f"{STABLE}/earnings-surprises", {"symbol": "AAPL"}),
            ("ETF holdings (stable)",         f"{STABLE}/etf-holdings",       {"symbol": "SPY",  "limit": 10}),
            ("Gainers hoy (stable)",          f"{STABLE}/gainers",            {}),
            ("Losers hoy (stable)",           f"{STABLE}/losers",             {}),
            ("Sector performance (stable)",   f"{STABLE}/sector-performance", {}),
            # V4 endpoints que aún pueden funcionar
            ("Company outlook v4",            f"{BASE}/v4/company-outlook",   {"symbol": "AAPL"}),
            ("Stock peers v4",                f"{BASE}/v4/stock_peers",       {"symbol": "AAPL"}),
            ("Search v3",                     f"{BASE}/v3/search",            {"query": "Apple", "limit": 5}),
            ("Search v3 ISIN",                f"{BASE}/v3/search",            {"query": "US0378331005", "limit": 3}),
        ]

        for label, url, params in tests:
            try:
                status, data = await get(c, url, params)
                if status == 200:
                    if isinstance(data, list) and data:
                        first = data[0]
                        # Mostrar 3 campos representativos
                        keys = list(first.keys())[:5]
                        preview = {k: first[k] for k in keys}
                        print(f"✓ [{status}] {label}")
                        print(f"       {preview}")
                    elif isinstance(data, dict) and data and "Error" not in str(data):
                        keys = list(data.keys())[:4]
                        preview = {k: data[k] for k in keys}
                        print(f"✓ [{status}] {label}")
                        print(f"       {preview}")
                    else:
                        print(f"? [{status}] {label} — vacío o error")
                        print(f"       {str(data)[:120]}")
                else:
                    print(f"✗ [{status}] {label}")
                    print(f"       {str(data)[:100]}")
            except Exception as e:
                print(f"✗ [ERR] {label} — {e}")

        print("\n=== FIN ===")

asyncio.run(test())
