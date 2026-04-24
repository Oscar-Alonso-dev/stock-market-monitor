"""
cnmv.py — Scraper de la API REST de la CNMV para fondos de inversión españoles.

La CNMV publica datos oficiales de todos los fondos registrados en España.
API base: https://srws.cnmv.es/api/v1/
Documentación: https://srws.cnmv.es/api/swagger/

Endpoints usados:
  GET /iic/fondos?isin={isin}          → Info del fondo (nombre, gestora, nregistro)
  GET /iic/vl?isin={isin}&_num=500     → Histórico de VL (Valor Liquidativo)
  GET /iic/fondos?_num=5000            → Lista completa de fondos (para búsqueda)
"""

import httpx, asyncio, time
from typing import Optional

CNMV_BASE  = "https://srws.cnmv.es/api/v1"
CNMV_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AurumMarkets/1.0)",
    "Accept": "application/json",
    "Origin": "https://www.cnmv.es",
    "Referer": "https://www.cnmv.es/",
}

# Caché en memoria para no saturar CNMV
_cnmv_cache: dict = {}

def _cache_get(key: str, ttl: int):
    e = _cnmv_cache.get(key)
    return e["data"] if e and time.time() - e["ts"] < ttl else None

def _cache_set(key: str, data):
    _cnmv_cache[key] = {"data": data, "ts": time.time()}


async def _fetch_catalog_cnmv(limit: int = 5000) -> list:
    """Descarga un catálogo amplio de fondos desde CNMV y lo cachea."""
    cached = _cache_get("cnmv_catalog:full", 86400)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=20.0, headers=CNMV_HEADERS) as c:
            r = await c.get(
                f"{CNMV_BASE}/iic/fondos",
                params={"_num": limit, "_ini": 0},
            )
            if r.status_code != 200:
                return []

            data = r.json()
            items = data.get("listResult", data if isinstance(data, list) else [])
            catalog = []
            for item in items:
                isin = item.get("isin") or item.get("ISIN") or ""
                nombre = item.get("nombre") or item.get("NOMBRE") or ""
                gestora = item.get("gestora") or item.get("GESTORA") or ""
                nreg = item.get("nregistro") or item.get("NREGISTRO") or ""
                if not isin and not nombre:
                    continue
                catalog.append({
                    "symbol": isin or nreg,
                    "isin": isin,
                    "name": nombre or isin or nreg,
                    "mgr": gestora,
                    "grp": "🏦 CNMV Catálogo",
                    "source": "cnmv_catalog",
                    "type": "MUTUALFUND",
                    "nregistro": nreg,
                })

            _cache_set("cnmv_catalog:full", catalog)
            return catalog
    except:
        return []


# ── Catálogo de fondos españoles con ISIN ────────────────────────────────────
# Mapeados manualmente — ISINs verificados en CNMV
FONDOS_ESP = {
    # Value Español
    "ES0169107098": {"name": "Cobas Internacional C FI",         "mgr": "Cobas AM",       "grp": "💎 Value Español"},
    "ES0169107049": {"name": "Cobas Selección FI",               "mgr": "Cobas AM",       "grp": "💎 Value Español"},
    "ES0169107056": {"name": "Cobas Grandes Compañías FI",       "mgr": "Cobas AM",       "grp": "💎 Value Español"},
    "ES0175897007": {"name": "azValor Internacional FI",         "mgr": "azValor AM",     "grp": "💎 Value Español"},
    "ES0175897031": {"name": "azValor Iberia FI",                "mgr": "azValor AM",     "grp": "💎 Value Español"},
    "ES0147622002": {"name": "Magallanes European Equity M FI",  "mgr": "Magallanes",     "grp": "💎 Value Español"},
    "ES0147622010": {"name": "Magallanes Iberian Equity M FI",   "mgr": "Magallanes",     "grp": "💎 Value Español"},
    "ES0180790006": {"name": "Bestinver Internacional FI",       "mgr": "Bestinver",      "grp": "💎 Value Español"},
    "ES0180790014": {"name": "Bestinver Bolsa FI",               "mgr": "Bestinver",      "grp": "💎 Value Español"},
    "ES0180790030": {"name": "Bestinver Patrimonio FI",          "mgr": "Bestinver",      "grp": "💎 Value Español"},
    "ES0180792002": {"name": "True Value FI",                    "mgr": "True Value AM",  "grp": "💎 Value Español"},
    "ES0180792028": {"name": "True Value Small Caps FI",         "mgr": "True Value AM",  "grp": "💎 Value Español"},
    "ES0180560009": {"name": "Valentum FI",                      "mgr": "Valentum AM",    "grp": "💎 Value Español"},
    "ES0162870003": {"name": "Metavalor Internacional FI",       "mgr": "Metagestión",    "grp": "💎 Value Español"},
    "ES0180847002": {"name": "Horos Internacional FI",           "mgr": "Horos AM",       "grp": "💎 Value Español"},
    "ES0180717002": {"name": "Numantia Patrimonio Global FI",    "mgr": "Numantia Gestión","grp": "💎 Value Español"},
    # Indexados España
    "ES0114930029": {"name": "Santander Índice España FI",       "mgr": "Santander AM",   "grp": "🇪🇸 Indexados España"},
    "ES0112705026": {"name": "BBVA Bolsa Índice España FI",      "mgr": "BBVA AM",        "grp": "🇪🇸 Indexados España"},
    "ES0120400003": {"name": "CaixaBank Bolsa Índice España FI", "mgr": "CaixaBank AM",   "grp": "🇪🇸 Indexados España"},
    "ES0162647008": {"name": "Bankinter Índice Español FI",      "mgr": "Bankinter Gestión","grp":"🇪🇸 Indexados España"},
    # Mixtos España
    "ES0138569037": {"name": "Cartesio X FI",                   "mgr": "Cartesio Inversiones","grp":"⚖️ Mixtos España"},
    "ES0138569011": {"name": "Cartesio Y FI",                   "mgr": "Cartesio Inversiones","grp":"⚖️ Mixtos España"},
    "ES0149133000": {"name": "Belgravia Epsilon FI",             "mgr": "Belgravia Capital","grp":"⚖️ Mixtos España"},
    "ES0180716004": {"name": "Cygnus Utilities, Infraestructures","mgr":"Cygnus AM",       "grp":"🔬 Sectoriales ES"},
}


async def get_fondo_info(isin: str) -> Optional[dict]:
    """Obtiene info básica del fondo desde CNMV por ISIN."""
    cached = _cache_get(f"cnmv_info:{isin}", 86400)  # 24h
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=10.0, headers=CNMV_HEADERS) as c:
            r = await c.get(f"{CNMV_BASE}/iic/fondos",
                            params={"isin": isin, "_num": 1})
            if r.status_code != 200:
                return None
            data = r.json()
            items = data.get("listResult", data if isinstance(data, list) else [])
            if not items:
                return None
            item = items[0]
            result = {
                "nregistro":  item.get("nregistro") or item.get("NREGISTRO"),
                "nombre":     item.get("nombre") or item.get("NOMBRE") or "",
                "gestora":    item.get("gestora") or item.get("GESTORA") or "",
                "isin":       isin,
            }
            _cache_set(f"cnmv_info:{isin}", result)
            return result
    except:
        return None


async def get_vl_historico(isin: str, num: int = 756) -> Optional[dict]:
    """
    Obtiene el histórico de VL (Valor Liquidativo) desde CNMV.
    num=252 → 1 año, num=756 → 3 años
    Devuelve dict compatible con el formato del endpoint /funds/{symbol}/detail
    """
    cached = _cache_get(f"cnmv_vl:{isin}", 3600)  # 1h
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=15.0, headers=CNMV_HEADERS) as c:
            # 1. Obtener nregistro
            info = await get_fondo_info(isin)
            nreg = info.get("nregistro") if info else None

            # 2. Obtener histórico VL
            # Endpoint alternativo si no tenemos nregistro: buscar por ISIN directamente
            r = await c.get(f"{CNMV_BASE}/iic/vl",
                            params={"isin": isin, "_num": num, "_ini": 0})

            if r.status_code != 200:
                return None

            data = r.json()
            items = data.get("listResult", data if isinstance(data, list) else [])

            if not items:
                return None

            # Parsear items — formato CNMV: {"fecha":"2024-01-15","vl":123.456}
            hist = []
            for item in items:
                fecha = item.get("fecha") or item.get("FECHA") or ""
                vl    = item.get("vl") or item.get("VL") or item.get("valorLiquidativo")
                if not fecha or not vl:
                    continue
                # Convertir fecha a timestamp Unix
                try:
                    from datetime import datetime
                    dt = datetime.strptime(str(fecha)[:10], "%Y-%m-%d")
                    ts = int(dt.timestamp())
                    hist.append({"date": ts, "nav": round(float(vl), 4)})
                except:
                    continue

            # Ordenar por fecha ascendente
            hist.sort(key=lambda x: x["date"])

            if not hist:
                return None

            current  = hist[-1]["nav"]
            prev     = hist[-2]["nav"] if len(hist) > 1 else current
            chg_pct  = round(((current - prev) / prev) * 100, 2) if prev else 0

            meta_info = FONDOS_ESP.get(isin, {})
            nombre    = (info.get("nombre") if info else None) or meta_info.get("name", isin)

            def ret(days):
                if len(hist) >= days:
                    old = hist[-days]["nav"]
                    return round(((current - old) / old) * 100, 2) if old else None
                return None

            from datetime import datetime
            y0      = int(datetime(datetime.now().year, 1, 1).timestamp())
            ytd_pts = [h for h in hist if h["date"] >= y0]
            ytd     = round(((current - ytd_pts[0]["nav"]) / ytd_pts[0]["nav"]) * 100, 2) if ytd_pts else None

            result = {
                "symbol":        isin,
                "name":          nombre,
                "type":          "MUTUALFUND",
                "currency":      "EUR",
                "exchange":      "CNMV",
                "current_nav":   round(current, 4),
                "current_price": round(current, 4),
                "prev_nav":      round(prev, 4),
                "change_pct":    chg_pct,
                "52w_high":      max((h["nav"] for h in hist[-252:]), default=None),
                "52w_low":       min((h["nav"] for h in hist[-252:]), default=None),
                "return_1d":     chg_pct,
                "return_1w":     ret(5),
                "return_1m":     ret(21),
                "return_3m":     ret(63),
                "return_6m":     ret(126),
                "return_ytd":    ytd,
                "return_1y":     ret(252),
                "return_3y":     ret(756),
                "history":       hist,
                "data_points":   len(hist),
                "source":        "cnmv",
                "gestora":       (info.get("gestora") if info else None) or meta_info.get("mgr", ""),
                "nregistro":     nreg,
                "isin":          isin,
            }
            _cache_set(f"cnmv_vl:{isin}", result)
            return result

    except Exception as e:
        return None


async def search_fondos_cnmv(query: str) -> list:
    """Busca fondos en CNMV por nombre."""
    cached = _cache_get(f"cnmv_search:{query.lower()}", 3600)
    if cached:
        return cached

    ql = query.lower().strip()
    local_results = []
    for isin, meta in FONDOS_ESP.items():
        haystack = " ".join([isin, meta.get("name", ""), meta.get("mgr", ""), meta.get("grp", "")]).lower()
        if ql and ql in haystack:
            local_results.append({
                "symbol": isin,
                "name": meta.get("name", isin),
                "isin": isin,
                "type": "MUTUALFUND",
                "exchange": "CNMV",
                "source": "cnmv_local",
                "gestora": meta.get("mgr", ""),
            })

    try:
        async with httpx.AsyncClient(timeout=10.0, headers=CNMV_HEADERS) as c:
            r = await c.get(f"{CNMV_BASE}/iic/fondos",
                            params={"nombre": query, "_num": 50, "_ini": 0})
            if r.status_code != 200:
                return local_results
            data = r.json()
            items = data.get("listResult", data if isinstance(data, list) else [])
            results = []
            for item in items:
                isin  = item.get("isin") or item.get("ISIN") or ""
                nombre= item.get("nombre") or item.get("NOMBRE") or ""
                nreg  = item.get("nregistro") or item.get("NREGISTRO") or ""
                gestora = item.get("gestora") or item.get("GESTORA") or ""
                if not isin and not nombre:
                    continue
                results.append({
                    "symbol":   isin or nreg,
                    "name":     nombre,
                    "isin":     isin,
                    "type":     "MUTUALFUND",
                    "exchange": "CNMV",
                    "source":   "cnmv",
                    "nregistro": nreg,
                    "gestora": gestora,
                })

            merged = []
            seen = set()
            for item in local_results + results:
                key = item.get("isin") or item.get("symbol") or item.get("name")
                if not key or key in seen:
                    continue
                seen.add(key)
                merged.append(item)

            _cache_set(f"cnmv_search:{query.lower()}", merged)
            return merged
    except:
        return local_results


# Lista de todos los ISINs que conocemos con su símbolo para el frontend
def get_catalog_cnmv() -> list:
    """Devuelve el catálogo de fondos CNMV con metadata."""
    return []


async def get_catalog_cnmv_full() -> list:
    """Devuelve el catálogo remoto de CNMV enriquecido con metadatos locales."""
    remote_catalog = await _fetch_catalog_cnmv()
    merged = []
    seen = set()

    for item in remote_catalog:
        isin = item.get("isin") or ""
        local_meta = FONDOS_ESP.get(isin, {})
        merged_item = {
            **item,
            "name": local_meta.get("name", item.get("name", "")),
            "mgr": local_meta.get("mgr", item.get("mgr", "")),
            "grp": local_meta.get("grp", item.get("grp", "🏦 CNMV Catálogo")),
        }
        key = merged_item.get("isin") or merged_item.get("symbol") or merged_item.get("name")
        if not key or key in seen:
            continue
        seen.add(key)
        merged.append(merged_item)

    for isin, meta in FONDOS_ESP.items():
        if isin in seen:
            continue
        merged.append({"symbol": isin, "isin": isin, **meta, "source": "cnmv_local", "type": "MUTUALFUND"})

    return merged
