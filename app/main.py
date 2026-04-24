import os, json, time, asyncio
import httpx  # importado al nivel módulo para reutilizar
from pathlib import Path
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from services.finnhub import (
    get_stock_quote, get_stock_profile, search_stocks,
    get_stock_metrics, get_stock_earnings,
    get_analyst_recommendations, get_company_news
)

app = FastAPI(title="Aurum Markets API", version="5.8.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])

# ── CONFIG ────────────────────────────────────────────────────────────────────
FMP_KEY    = os.getenv("FMP_KEY",       "hsAsc6Yt9nIwlYTAW1AUOBX7U6MQUNOL")
EODHD_KEY  = os.getenv("EODHD_KEY",    "69a1df0a3c8948.57484984")
FMP_BASE   = "https://financialmodelingprep.com/stable"
EODHD_BASE = "https://eodhd.com/api"

YAHOO_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "Accept-Language": "es-ES,es;q=0.9",
}
MSTAR_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.morningstar.es/",
}

# ── CACHÉ ─────────────────────────────────────────────────────────────────────
_cache: dict = {}

def cache_get(key):
    e = _cache.get(key)
    return e["data"] if e and time.time() - e["ts"] < e["ttl"] else None

def cache_set(key, data, ttl=30):
    _cache[key] = {"data": data, "ts": time.time(), "ttl": ttl}

async def cached(key, fn, ttl=30):
    hit = cache_get(key)
    if hit is not None:
        return hit
    data = await fn()
    cache_set(key, data, ttl)
    return data

# ── FMP helper ────────────────────────────────────────────────────────────────
async def fmp_get(path: str, params: dict = {}, timeout=15.0):
    """GET a FMP /stable endpoint. Devuelve [] si 404."""
    import httpx
    cached_fmp = cache_get(f"fmp:{path}:{str(sorted(params.items()))}")
    if cached_fmp is not None:
        return cached_fmp
    async with httpx.AsyncClient(timeout=timeout) as c:
        r = await c.get(f"{FMP_BASE}/{path}",
                        params={"apikey": FMP_KEY, **params})
        if r.status_code == 200:
            d = r.json()
            result = d if d else []
            # Caché de datos FMP: 24h para datos históricos, 5min para quotes
            ttl = 300 if path == "quote" else 86400
            cache_set(f"fmp:{path}:{str(sorted(params.items()))}", result, ttl=ttl)
            return result
        return []

# ── TICKERS LOCALES ───────────────────────────────────────────────────────────
TICKERS_LIGHT: list = []
TICKERS_BY_SYM: dict = {}
TICKERS_LOADED = False

def load_tickers():
    global TICKERS_LIGHT, TICKERS_BY_SYM, TICKERS_LOADED
    p = Path(__file__).parent / "data" / "tickers_light.json"
    if p.exists():
        with open(p, encoding="utf-8") as f:
            TICKERS_LIGHT = json.load(f)
        TICKERS_BY_SYM = {t["s"]: t for t in TICKERS_LIGHT}
        TICKERS_LOADED = True
        print(f"✓ Tickers: {len(TICKERS_LIGHT):,}")
    else:
        print("⚠  Sin tickers_light.json — ejecuta download_tickers_eodhd.py")

# ── CNMV ─────────────────────────────────────────────────────────────────────
try:
    from cnmv import get_vl_historico, search_fondos_cnmv, get_catalog_cnmv, get_catalog_cnmv_full, FONDOS_ESP
    CNMV_OK = True
    print("✓ Módulo CNMV cargado")
except ImportError:
    CNMV_OK = False
    print("⚠  cnmv.py no encontrado — fondos españoles sin datos CNMV")

@app.on_event("startup")
async def startup():
    load_tickers()

def search_local(query: str, limit=50) -> list:
    q, ql = query.upper().strip(), query.lower().strip()
    if not q:
        return []
    results, seen = [], set()

    def add(t, score):
        if t["s"] not in seen and len(results) < limit:
            seen.add(t["s"])
            results.append({**t, "_score": score})

    if q in TICKERS_BY_SYM:
        add(TICKERS_BY_SYM[q], 100)
    for t in TICKERS_LIGHT:
        if len(results) >= limit: break
        if t["s"].upper().startswith(q) and t["s"].upper() != q:
            add(t, 90)
    for t in TICKERS_LIGHT:
        if len(results) >= limit: break
        if t["n"].lower().startswith(ql):
            add(t, 80)
    for t in TICKERS_LIGHT:
        if len(results) >= limit: break
        if ql in t["n"].lower():
            add(t, 60)
    if len(query) == 12 and query[:2].isalpha():
        for t in TICKERS_LIGHT:
            if t.get("i", "").upper() == q:
                add(t, 95)
    results.sort(key=lambda x: -x["_score"])
    return results[:limit]

# ── HEALTH ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": "5.8.0",
            "tickers": len(TICKERS_LIGHT), "cache": len(_cache)}

# ── BÚSQUEDA UNIVERSAL ────────────────────────────────────────────────────────
@app.get("/search")
async def universal_search(q: str = Query(..., min_length=1), limit: int = 30):
    if TICKERS_LOADED and len(TICKERS_LIGHT) > 1000:
        results = search_local(q, limit)
        return {
            "query": q, "count": len(results), "source": "local",
            "results": [{"symbol": r["s"], "name": r["n"], "exchange": r["e"],
                         "type": r["t"], "isin": r.get("i", ""),
                         "region": r.get("r", ""), "currency": r.get("c", "")}
                        for r in results]
        }
    # Fallback EODHD
    async def fetch():
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as c:
            r = await c.get(f"{EODHD_BASE}/search/{q}",
                params={"api_token": EODHD_KEY, "limit": limit, "fmt": "json"})
            data = r.json() if r.status_code == 200 else []
            if not isinstance(data, list): data = []
            return {
                "query": q, "count": len(data), "source": "eodhd",
                "results": [{"symbol": d.get("Code", ""), "name": d.get("Name", ""),
                             "exchange": d.get("Exchange", ""), "type": d.get("Type", "").lower(),
                             "isin": d.get("ISIN", "") or "", "region": "",
                             "currency": d.get("Currency", "")}
                            for d in data if d.get("Code")]
            }
    return await cached(f"search:{q.lower()}", fetch, ttl=300)

@app.get("/stocks/search/{query}")
async def search_legacy(query: str, limit: int = 20):
    r = await universal_search(q=query, limit=limit)
    return {"count": r["count"], "result": [
        {"symbol": x["symbol"], "description": x["name"], "type": x["type"],
         "displaySymbol": x["symbol"], "exchange": x["exchange"]}
        for x in r["results"]]}

# ── STOCKS — FICHA COMPLETA ───────────────────────────────────────────────────
@app.get("/stocks/{symbol}/detail")
async def stock_detail(symbol: str):
    """
    Ficha completa combinando:
    - Yahoo Finance chart: precio actual + histórico 1 año
    - FMP /stable: perfil, ratios, key metrics, income statement, cash flow, peers
    Todo con caché agresivo para no gastar cuota de API.
    """
    sym = symbol.upper()
    yahoo_sym = sym[:-3] if sym.endswith(".US") else sym

    async def fetch():
        import httpx

        # 1. Yahoo chart — precio + histórico (siempre funciona)
        async with httpx.AsyncClient(timeout=20.0) as c:
            r = await c.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_sym}",
                params={"interval": "1d", "range": "1y"},
                headers=YAHOO_HEADERS)
            chart_res = r.json().get("chart", {}).get("result", [])
            if not chart_res:
                raise HTTPException(404, f"'{sym}' no encontrado")
            meta   = chart_res[0].get("meta", {})
            ts     = chart_res[0].get("timestamp", [])
            q_data = chart_res[0].get("indicators", {}).get("quote", [{}])[0]
            hist   = [{"date": t, "price": round(float(p), 4), "vol": v or 0}
                      for t, p, v in zip(ts,
                                         q_data.get("close", []),
                                         q_data.get("volume", [])) if p]
            current = meta.get("regularMarketPrice") or (hist[-1]["price"] if hist else 0)
            prev    = meta.get("chartPreviousClose") or (hist[-2]["price"] if len(hist) > 1 else current)
            chg_pct = round(((current - prev) / prev) * 100, 2) if prev else 0

        # 2. FMP: todos los datos en paralelo (caché 24h)
        # Para acciones españolas (SAN.MC) usamos SAN en FMP
        fmp_sym = yahoo_sym.split(".")[0]

        profile_key = f"fmp_profile:{fmp_sym}"
        profile_data = cache_get(profile_key)
        if profile_data is None:
            results = await asyncio.gather(
                fmp_get("profile",            {"symbol": fmp_sym}),
                fmp_get("ratios",             {"symbol": fmp_sym, "limit": 1}),
                fmp_get("key-metrics",        {"symbol": fmp_sym, "limit": 1}),
                fmp_get("income-statement",   {"symbol": fmp_sym, "limit": 4}),
                fmp_get("cash-flow-statement",{"symbol": fmp_sym, "limit": 4}),
                fmp_get("stock-peers",        {"symbol": fmp_sym}),
                fmp_get("quote",              {"symbol": fmp_sym}),
                return_exceptions=True
            )
            profile_raw, ratios_raw, metrics_raw, income_raw, cashflow_raw, peers_raw, quote_raw = [
                r if isinstance(r, list) else [] for r in results
            ]
            profile_data = {
                "profile":  profile_raw[0]  if profile_raw  else {},
                "ratios":   ratios_raw[0]   if ratios_raw   else {},
                "metrics":  metrics_raw[0]  if metrics_raw  else {},
                "income":   income_raw,
                "cashflow": cashflow_raw,
                "peers":    peers_raw[:8]   if peers_raw    else [],
                "quote":    quote_raw[0]    if isinstance(quote_raw, list) and quote_raw else
                            quote_raw       if isinstance(quote_raw, dict) else {},
            }
            cache_set(profile_key, profile_data, ttl=86400)  # 24h

        p  = profile_data.get("profile", {})
        ra = profile_data.get("ratios", {})
        km = profile_data.get("metrics", {})
        qt = profile_data.get("quote", {})

        # Helper: buscar en múltiples dicts
        def fv(*keys):
            for d in [p, ra, km, qt]:
                for k in keys:
                    v = d.get(k)
                    if v is not None and v != "" and v != 0:
                        return v
            return None

        local = TICKERS_BY_SYM.get(sym, {})

        # Procesar income statements para gráfico de revenue/net income
        income_chart = []
        for stmt in reversed(profile_data.get("income", [])):
            income_chart.append({
                "year":        stmt.get("calendarYear") or stmt.get("date", "")[:4],
                "revenue":     stmt.get("revenue"),
                "grossProfit": stmt.get("grossProfit"),
                "ebitda":      stmt.get("ebitda"),
                "netIncome":   stmt.get("netIncome"),
                "eps":         stmt.get("eps"),
            })

        cashflow_chart = []
        for stmt in reversed(profile_data.get("cashflow", [])):
            cashflow_chart.append({
                "year":         stmt.get("calendarYear") or stmt.get("date", "")[:4],
                "operatingCF":  stmt.get("operatingCashFlow"),
                "freeCF":       stmt.get("freeCashFlow"),
                "capex":        stmt.get("capitalExpenditure"),
                "dividends":    stmt.get("dividendsPaid"),
                "repurchases":  stmt.get("commonStockRepurchased"),
            })

        return {
            "symbol":        sym,
            "name":          fv("companyName", "name") or meta.get("longName") or meta.get("shortName") or sym,
            "sector":        fv("sector"),
            "industry":      fv("industry"),
            "description":   fv("description"),
            "website":       fv("website"),
            "ceo":           fv("ceo"),
            "employees":     fv("fullTimeEmployees"),
            "country":       fv("country"),
            "exchange":      meta.get("exchangeName") or fv("exchange") or local.get("e", ""),
            "currency":      meta.get("currency") or fv("currency") or local.get("c", "USD"),
            "isin":          local.get("i", ""),
            "market_state":  meta.get("marketState", "CLOSED"),
            # ── Precio ──────────────────────────────────────────────────────
            "current":       current,
            "prev_close":    prev,
            "change_pct":    chg_pct,
            "52w_high":      fv("yearHigh", "fiftyTwoWeekHigh") or meta.get("fiftyTwoWeekHigh"),
            "52w_low":       fv("yearLow",  "fiftyTwoWeekLow")  or meta.get("fiftyTwoWeekLow"),
            "market_cap":    fv("marketCap", "mktCap"),
            "volume":        fv("volume") or meta.get("regularMarketVolume"),
            "avg_volume":    fv("avgVolume"),
            "shares":        fv("sharesOutstanding"),
            # ── Valoración ──────────────────────────────────────────────────
            "per":           fv("peRatioTTM", "peRatio", "pe"),
            "forward_per":   fv("priceEarningsRatioTTM", "forwardPE"),
            "peg":           fv("pegRatioTTM", "pegRatio"),
            "p_book":        fv("priceToBookRatioTTM", "pbRatioTTM", "priceToBook"),
            "p_sales":       fv("priceToSalesRatioTTM", "priceSalesRatioTTM"),
            "p_fcf":         fv("priceToFreeCashFlowsRatioTTM", "pfcfRatioTTM"),
            "ev_ebitda":     fv("enterpriseValueOverEBITDATTM", "evToEbitda"),
            "ev_revenue":    fv("evToSales", "evToRevenue"),
            # ── Rentabilidad ─────────────────────────────────────────────────
            "roe":           fv("returnOnEquityTTM", "roe"),
            "roa":           fv("returnOnAssetsTTM", "roa"),
            "roic":          fv("returnOnInvestedCapitalTTM", "roic"),
            "margin_gross":  fv("grossProfitMarginTTM", "grossProfitMargin"),
            "margin_op":     fv("operatingProfitMarginTTM", "operatingProfitMargin"),
            "margin_net":    fv("netProfitMarginTTM", "netProfitMargin"),
            "margin_fcf":    fv("freeCashFlowMarginTTM"),
            # ── Crecimiento ──────────────────────────────────────────────────
            "revenue_growth":  fv("revenueGrowthTTM", "revenueGrowth"),
            "earnings_growth": fv("epsgrowthTTM", "epsGrowth"),
            # ── Deuda y liquidez ─────────────────────────────────────────────
            "debt_equity":   fv("debtEquityRatioTTM", "debtToEquity"),
            "current_ratio": fv("currentRatioTTM", "currentRatio"),
            "quick_ratio":   fv("quickRatioTTM", "quickRatio"),
            "net_debt":      fv("netDebtTTM", "netDebt"),
            "interest_cov":  fv("interestCoverageTTM"),
            # ── Dividendo ────────────────────────────────────────────────────
            "dividend_yield":  fv("dividendYieldTTM", "dividendYield"),
            "dividend_payout": fv("dividendPayoutRatioTTM", "payoutRatio"),
            "last_dividend":   fv("lastDividend"),
            "beta":            fv("beta"),
            # ── Financieros históricos ───────────────────────────────────────
            "income_chart":   income_chart,
            "cashflow_chart": cashflow_chart,
            # ── Peers ────────────────────────────────────────────────────────
            "peers": [{"symbol": p.get("symbol"), "name": p.get("companyName"),
                       "price": p.get("price"), "mkt_cap": p.get("mktCap")}
                      for p in profile_data.get("peers", [])
                      if isinstance(p, dict) and p.get("symbol")],
            # ── Gráfico histórico ─────────────────────────────────────────────
            "history":      hist,
            "data_source":  "yahoo+fmp",
        }

    return await cached(f"detail:{sym}", fetch, ttl=300)

# ── CHART ─────────────────────────────────────────────────────────────────────
RANGE_CFG = {
    "1D": {"interval":"5m",  "range":"1d",  "ttl":30},
    "5D": {"interval":"15m", "range":"5d",  "ttl":120},
    "1M": {"interval":"1d",  "range":"1mo", "ttl":1800},
    "3M": {"interval":"1d",  "range":"3mo", "ttl":3600},
    "6M": {"interval":"1d",  "range":"6mo", "ttl":3600},
    "1Y": {"interval":"1d",  "range":"1y",  "ttl":3600},
    "5Y": {"interval":"1wk", "range":"5y",  "ttl":7200},
}

@app.get("/stocks/{symbol:path}/chart")
async def chart(symbol: str, range: str = "1D"):
    sym = symbol.upper()
    yahoo_sym = sym[:-3] if sym.endswith(".US") else sym
    cfg = RANGE_CFG.get(range.upper(), RANGE_CFG["1D"])

    async def fetch():
        import httpx
        async with httpx.AsyncClient(timeout=20.0) as c:
            r = await c.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_sym}",
                params={"interval": cfg["interval"], "range": cfg["range"]},
                headers=YAHOO_HEADERS)
            res = r.json().get("chart", {}).get("result", [])
            if not res: raise HTTPException(404, f"Sin datos para {sym}")
            meta = res[0].get("meta", {})
            ts   = res[0].get("timestamp", [])
            q    = res[0].get("indicators", {}).get("quote", [{}])[0]
            pts  = []
            for i, t in enumerate(ts):
                cv = (q.get("close") or [])[i] if i < len(q.get("close") or []) else None
                if cv is None: continue
                pts.append({
                    "ts": t, "time": t, "price": round(cv, 4),
                    "open":  round(q["open"][i],  4) if q.get("open")   and i < len(q["open"])   and q["open"][i]   else None,
                    "high":  round(q["high"][i],  4) if q.get("high")   and i < len(q["high"])   and q["high"][i]   else None,
                    "low":   round(q["low"][i],   4) if q.get("low")    and i < len(q["low"])    and q["low"][i]    else None,
                    "vol":   q["volume"][i]           if q.get("volume") and i < len(q["volume"]) and q["volume"][i]  else 0,
                })
            cur  = meta.get("regularMarketPrice") or (pts[-1]["price"] if pts else 0)
            prev = meta.get("chartPreviousClose") or (pts[0]["price"]  if pts else cur)
            chg  = round(cur - prev, 4)
            return {"symbol": sym, "range": range, "current": cur, "prev_close": prev,
                    "change": chg, "change_pct": round(chg/prev*100, 4) if prev else 0,
                    "currency": meta.get("currency", "USD"), "name": meta.get("longName") or meta.get("shortName") or sym,
                    "market_state": meta.get("marketState", "CLOSED"), "points": pts}
    return await cached(f"chart:{sym}:{range}", fetch, ttl=cfg["ttl"])

# ── QUOTES BATCH ──────────────────────────────────────────────────────────────
# Usa Yahoo Finance v8/finance/chart — funciona con acciones, índices (^GSPC),
# futuros (GC=F) y crypto (BTC-USD). Peticiones en paralelo + caché 20s.

@app.get("/market/quotes")
async def batch_quotes(symbols: str = Query(...)):
    import httpx
    sl = [s.strip().upper() for s in symbols.split(",") if s.strip()][:60]
    if not sl:
        return []

    # Devolver desde caché si están todos
    cache_key = f"quotes:{'|'.join(sorted(sl))}"
    hit = cache_get(cache_key)
    if hit is not None:
        return hit

    # Filtrar los que ya están en caché individual
    to_fetch = [s for s in sl if cache_get(f"q1:{s}") is None]
    cached_ones = {s: cache_get(f"q1:{s}") for s in sl if cache_get(f"q1:{s}") is not None}

    async def fetch_one(client: "httpx.AsyncClient", sym: str):
        """Reutiliza el cliente compartido — sin overhead de conexión por símbolo."""
        yahoo_sym = sym[:-3] if sym.endswith(".US") else sym
        try:
            r = await client.get(
                f"https://query1.finance.yahoo.com/v8/finance/chart/{yahoo_sym}",
                params={"interval": "1d", "range": "5d"})
            if r.status_code != 200:
                return {"symbol": sym, "error": True}
            res = r.json().get("chart", {}).get("result", [])
            if not res:
                return {"symbol": sym, "error": True}
            meta = res[0].get("meta", {})
            cur  = meta.get("regularMarketPrice") or 0
            prev = meta.get("chartPreviousClose") or cur
            chg  = round(((cur - prev) / prev) * 100, 2) if prev else 0
            result = {
                "symbol":         sym,
                "current_price":  cur,
                "change_percent": chg,
                "change":         round(cur - prev, 4),
                "volume":         meta.get("regularMarketVolume") or 0,
                "market_cap":     meta.get("marketCap"),
                "name":           meta.get("longName") or meta.get("shortName") or sym,
                "currency":       meta.get("currency", ""),
            }
            cache_set(f"q1:{sym}", result, ttl=20)
            return result
        except:
            return {"symbol": sym, "error": True}

    # Un solo cliente HTTP compartido para todas las peticiones paralelas
    if to_fetch:
        async with httpx.AsyncClient(timeout=8.0, headers=YAHOO_HEADERS,
                                     limits=httpx.Limits(max_connections=20)) as client:
            new_results = await asyncio.gather(*[fetch_one(client, s) for s in to_fetch])
    else:
        new_results = []

    # Combinar caché + nuevos resultados en el orden original
    fetched_map = {r["symbol"]: r for r in new_results}
    all_results = [cached_ones.get(s) or fetched_map.get(s) or {"symbol": s, "error": True} for s in sl]
    cache_set(cache_key, all_results, ttl=20)
    return all_results

# ── IBEX35 ────────────────────────────────────────────────────────────────────
IBEX35 = ["SAN.MC","BBVA.MC","ITX.MC","IBE.MC","REP.MC","TEF.MC","CABK.MC",
    "AMS.MC","FER.MC","ACS.MC","GRF.MC","IAG.MC","ACX.MC","NTGY.MC",
    "CLNX.MC","MEL.MC","MAP.MC","BKT.MC","AENA.MC","ELE.MC",
    "COL.MC","ENG.MC","MRL.MC","VIS.MC","SAB.MC","MTS.MC","PHM.MC",
    "LOG.MC","ROVI.MC","SLR.MC","ENCE.MC","PRIM.MC","SGRE.MC"]

@app.get("/market/ibex35")
async def ibex35():
    """IBEX35 via batch_quotes — reutiliza la misma lógica y caché."""
    cached = cache_get("ibex35:full")
    if cached: return cached

    # Reutilizar batch_quotes directamente
    from fastapi import Request
    quotes = await batch_quotes(symbols=",".join(IBEX35))
    result = [
        {"symbol": q["symbol"], "name": q.get("name", q["symbol"]),
         "price": q.get("current_price", 0), "change_pct": q.get("change_percent", 0),
         "change": q.get("change", 0), "volume": q.get("volume", 0),
         "market_cap": q.get("market_cap"), "currency": q.get("currency", "EUR"),
         "market_state": "REGULAR"}
        for q in quotes if not q.get("error")
    ]
    cache_set("ibex35:full", result, ttl=20)
    return result

# ── STOCKS legacy ─────────────────────────────────────────────────────────────
@app.get("/stocks/{symbol}/quote")
async def quote(symbol:str):
    return await cached(f"quote:{symbol.upper()}",lambda:get_stock_quote(symbol.upper()),ttl=30)
@app.get("/stocks/{symbol}/profile")
async def profile(symbol:str):
    return await cached(f"profile:{symbol.upper()}",lambda:get_stock_profile(symbol.upper()),ttl=3600)
@app.get("/stocks/{symbol}/metrics")
async def metrics(symbol:str):
    return await cached(f"metrics:{symbol.upper()}",lambda:get_stock_metrics(symbol.upper()),ttl=3600)
@app.get("/stocks/{symbol}/earnings")
async def earnings(symbol:str):
    return await cached(f"earnings:{symbol.upper()}",lambda:get_stock_earnings(symbol.upper()),ttl=3600)
@app.get("/stocks/{symbol}/recommendations")
async def recommendations(symbol:str):
    return await cached(f"rec:{symbol.upper()}",lambda:get_analyst_recommendations(symbol.upper()),ttl=3600)
@app.get("/stocks/{symbol}/news")
async def news(symbol:str):
    return await cached(f"news:{symbol.upper()}",lambda:get_company_news(symbol.upper()),ttl=600)

# ── FONDOS ────────────────────────────────────────────────────────────────────
@app.get("/funds/search")
async def funds_search(q: str = Query(..., min_length=1)):
    async def fetch():
        import httpx
        results = []
        def push_result(item: dict):
            symbol = (item.get("symbol") or "").strip()
            name = (item.get("name") or "").strip()
            if not symbol or not name:
                return
            key_symbol = symbol.upper()
            key_isin = (item.get("isin") or "").strip().upper()
            for existing in results:
                existing_symbol = (existing.get("symbol") or "").strip().upper()
                existing_isin = (existing.get("isin") or "").strip().upper()
                if key_symbol == existing_symbol or (key_isin and key_isin == existing_isin):
                    for field in ("mstar_id", "isin", "exchange", "source", "gestora", "type"):
                        if item.get(field) and not existing.get(field):
                            existing[field] = item[field]
                    return
            results.append(item)
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as c:
            try:
                r = await c.get("https://www.morningstar.es/es/util/SecuritySearch.ashx",
                    params={"q":q,"limit":40,"investmentTyp":"","universeIds":"FOESP$$ALL|FOEUR$$ALL|ETFESP$$ALL|ETFEUR$$ALL"},
                    headers=MSTAR_HEADERS, timeout=10.0)
                if r.status_code==200 and r.text:
                    for line in r.text.strip().split("\n"):
                        parts=line.strip().split("|")
                        if len(parts)<2: continue
                        try: meta=json.loads(parts[1])
                        except: continue
                        pi=meta.get("pi","")
                        if not pi: continue
                        push_result({"symbol":f"{pi}.F","mstar_id":meta.get("i",""),
                            "name":parts[0].strip(),"type":"MUTUALFUND",
                            "exchange":"Morningstar ES",
                            "isin":meta.get("isin","") or meta.get("ISIN","") or "",
                            "gestora":meta.get("company","") or meta.get("providerCompanyName","") or "",
                            "source":"morningstar"})
            except: pass
            try:
                r2=await c.get("https://query1.finance.yahoo.com/v1/finance/search",
                    params={"q":q,"quotesCount":25,"newsCount":0}, headers=YAHOO_HEADERS, timeout=10.0)
                if r2.status_code==200:
                    for item in r2.json().get("quotes",[]):
                        quote_type = (item.get("quoteType","") or "").upper()
                        if quote_type not in {"MUTUALFUND", "ETF"}:
                            continue
                        sym=item.get("symbol","")
                        if not sym:
                            continue
                        push_result({"symbol":sym,"mstar_id":"",
                            "name":item.get("longname") or item.get("shortname") or sym,
                            "type":quote_type,"exchange":item.get("exchDisp") or "",
                            "isin":item.get("isin","") or "",
                            "source":"yahoo"})
            except: pass
        return results[:60]
    base_results = await cached(f"funds_search:{q.lower().strip()}", fetch, ttl=300)

    # Añadir resultados CNMV si disponible
    if CNMV_OK:
        try:
            cnmv_results = await search_fondos_cnmv(q)
            # Deduplicar por símbolo/ISIN
            existing = {(r.get("symbol") or "").upper() for r in base_results}
            existing_isins = {(r.get("isin") or "").upper() for r in base_results if r.get("isin")}
            for cr in cnmv_results:
                cr_symbol = (cr.get("symbol") or "").upper()
                cr_isin = (cr.get("isin") or "").upper()
                if cr_symbol not in existing and (not cr_isin or cr_isin not in existing_isins):
                    base_results.append(cr)
                    existing.add(cr_symbol)
                    if cr_isin:
                        existing_isins.add(cr_isin)
        except:
            pass

    return base_results[:80]

@app.get("/funds/cnmv/catalog")
async def cnmv_catalog():
    """Devuelve el catálogo completo de fondos españoles con sus ISINs."""
    if not CNMV_OK:
        return []
    return await get_catalog_cnmv_full()

@app.get("/funds/cnmv/search")
async def cnmv_search(q: str = Query(..., min_length=2)):
    """Busca fondos en la CNMV por nombre."""
    if not CNMV_OK:
        return []
    return await search_fondos_cnmv(q)

@app.get("/funds/{symbol}/detail")
async def fund_detail(symbol: str):
    async def fetch():
        import httpx, datetime

        async def yahoo_chart(sym: str):
            async with httpx.AsyncClient(timeout=20.0) as c:
                r = await c.get(
                    f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}",
                    params={"interval": "1d", "range": "1y"},
                    headers=YAHOO_HEADERS)
                if r.status_code != 200:
                    return None

                data = r.json()
                res  = data.get("chart", {}).get("result", [])
                if not res:
                    return None

                meta   = res[0].get("meta", {})
                ts     = res[0].get("timestamp", [])
                quotes = res[0].get("indicators", {}).get("quote", [{}])[0]
                closes = quotes.get("close", [])

                hist = []
                for i, t in enumerate(ts):
                    p = closes[i] if i < len(closes) else None
                    if p and p > 0:
                        hist.append({"date": t, "nav": round(float(p), 4)})

                if not hist:
                    return None

                current = meta.get("regularMarketPrice") or hist[-1]["nav"]
                prev    = meta.get("chartPreviousClose") or (hist[-2]["nav"] if len(hist) > 1 else current)
                chg_pct = round(((current - prev) / prev) * 100, 2) if prev else 0

                def ret(days):
                    if len(hist) >= days:
                        old = hist[-days]["nav"]
                        return round(((current - old) / old) * 100, 2) if old else None
                    return None

                y0      = int(datetime.datetime(datetime.datetime.now().year, 1, 1).timestamp())
                ytd_pts = [h for h in hist if h["date"] >= y0]
                ytd     = round(((current - ytd_pts[0]["nav"]) / ytd_pts[0]["nav"]) * 100, 2) if ytd_pts else None
                name = meta.get("longName") or meta.get("shortName") or sym

                return {
                    "symbol":       sym,
                    "name":         name,
                    "type":         meta.get("instrumentType") or meta.get("quoteType") or "ETF",
                    "currency":     meta.get("currency", "EUR"),
                    "exchange":     meta.get("exchangeName", ""),
                    "current_nav":  round(current, 4),
                    "current_price":round(current, 4),
                    "prev_nav":     round(prev, 4),
                    "change_pct":   chg_pct,
                    "52w_high":     meta.get("fiftyTwoWeekHigh"),
                    "52w_low":      meta.get("fiftyTwoWeekLow"),
                    "return_1d":    chg_pct,
                    "return_1w":    ret(5),
                    "return_1m":    ret(21),
                    "return_3m":    ret(63),
                    "return_6m":    ret(126),
                    "return_ytd":   ytd,
                    "return_1y":    ret(252),
                    "return_3y":    ret(min(756, len(hist)-1)),
                    "history":      hist,
                    "data_points":  len(hist),
                    "source":       "yahoo_finance",
                }

        async def resolve_yahoo_symbol(raw_symbol: str):
            async with httpx.AsyncClient(timeout=10.0) as c:
                r = await c.get(
                    "https://query1.finance.yahoo.com/v1/finance/search",
                    params={"q": raw_symbol, "quotesCount": 10, "newsCount": 0},
                    headers=YAHOO_HEADERS)
                if r.status_code != 200:
                    return None
                for item in r.json().get("quotes", []):
                    quote_type = (item.get("quoteType", "") or "").upper()
                    if quote_type in {"MUTUALFUND", "ETF"} and item.get("symbol"):
                        return item["symbol"]
            return None

        # ── Ruta 1: ISIN español → CNMV (fuente oficial, datos garantizados) ──
        is_spanish_isin = symbol.startswith("ES") and len(symbol) == 12
        if is_spanish_isin and CNMV_OK:
            result = await get_vl_historico(symbol, num=756)
            if result:
                return result
            # Si CNMV falla, intentar Yahoo como fallback

        # ── Ruta 2: Yahoo Finance (ETFs, acciones, fondos 0P...) ─────────────
        yahoo_result = await yahoo_chart(symbol)
        if yahoo_result:
            return yahoo_result

        if len(symbol) >= 10:
            resolved_symbol = await resolve_yahoo_symbol(symbol)
            if resolved_symbol:
                yahoo_result = await yahoo_chart(resolved_symbol)
                if yahoo_result:
                    yahoo_result["requested_symbol"] = symbol
                    yahoo_result["resolved_symbol"] = resolved_symbol
                    return yahoo_result

        raise HTTPException(404, f"Sin datos para fondo/ETF '{symbol}'")
    return await cached(f"fund_detail:{symbol}", fetch, ttl=3600)

# ── CRYPTO ────────────────────────────────────────────────────────────────────
@app.get("/crypto/{coin}")
async def crypto(coin:str):
    async def fetch():
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as c:
            r=await c.get("https://api.coingecko.com/api/v3/simple/price",
                params={"ids":coin,"vs_currencies":"usd","include_24hr_change":"true"})
            d=r.json().get(coin,{})
            return{"current_price":d.get("usd"),"change_percent":d.get("usd_24h_change"),"change":0}
    return await cached(f"crypto:{coin}",fetch,ttl=60)

# ── DIVISAS ───────────────────────────────────────────────────────────────────
@app.get("/currency/rates")
async def currency_rates():
    async def fetch():
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as c:
            r=await c.get("https://api.frankfurter.app/latest",params={"from":"EUR"})
            d=r.json(); rates=d.get("rates",{}); rates["EUR"]=1.0
            return{"base":"EUR","date":d.get("date"),"rates":rates}
    return await cached("currency:rates",fetch,ttl=3600)

@app.get("/currency/convert")
async def currency_convert(amount:float,from_:str=Query(alias="from"),to:str="USD"):
    rd=await currency_rates(); rates=rd["rates"]
    fu,tu=from_.upper(),to.upper()
    if fu not in rates or tu not in rates: raise HTTPException(400,"Divisa no encontrada")
    return{"amount":amount,"from":fu,"to":tu,
           "result":round((amount/rates[fu])*rates[tu],6),
           "rate":round(rates[tu]/rates[fu],6),"date":rd["date"]}

@app.get("/tickers/stats")
def ticker_stats():
    if not TICKERS_LOADED: return{"loaded":False}
    by_ex,by_type={},{}
    for t in TICKERS_LIGHT:
        by_ex[t["e"]]=by_ex.get(t["e"],0)+1
        by_type[t["t"]]=by_type.get(t["t"],0)+1
    return{"loaded":True,"total":len(TICKERS_LIGHT),
           "by_exchange":dict(sorted(by_ex.items(),key=lambda x:-x[1])[:20]),
           "by_type":dict(sorted(by_type.items(),key=lambda x:-x[1]))}
