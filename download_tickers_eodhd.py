"""
download_tickers_eodhd.py
=========================
Descarga la lista completa de instrumentos financieros de EODHD
y genera el archivo data/tickers_light.json usado por el backend.

Uso:
    cd C:\\proyectos\\stock-market-monitor
    venv\\Scripts\\activate
    python download_tickers_eodhd.py

Tiempo estimado: 2-3 minutos
Resultado: app/data/tickers_light.json con 50.000+ tickers
"""

import httpx, json, asyncio, os, time
from pathlib import Path

API_KEY = "69a1df0a3c8948.57484984"
BASE    = "https://eodhd.com/api"

# Bolsas a descargar — cada una cuesta 1 API call del plan gratuito
# Con 20 calls/día podemos bajar ~20 bolsas
EXCHANGES = [
    # USA — las más importantes
    {"code": "US",     "label": "NYSE/NASDAQ",    "region": "USA"},
    {"code": "NASDAQ", "label": "NASDAQ",          "region": "USA"},
    # España
    {"code": "MC",     "label": "BME (España)",    "region": "España"},
    # Europa
    {"code": "PA",     "label": "Euronext Paris",  "region": "Europa"},
    {"code": "XETRA",  "label": "Xetra (Alemania)","region": "Europa"},
    {"code": "LSE",    "label": "Londres (LSE)",   "region": "Europa"},
    {"code": "MI",     "label": "Borsa Italiana",  "region": "Europa"},
    {"code": "AS",     "label": "Amsterdam",       "region": "Europa"},
    # ETFs
    {"code": "ETF",    "label": "ETFs USA",        "region": "ETF"},
    # Fondos USA
    {"code": "FUND",   "label": "Mutual Funds USA","region": "FUND"},
]

TYPE_MAP = {
    "Common Stock": "stock",
    "ETF":          "etf",
    "Mutual Fund":  "fund",
    "Preferred Stock": "preferred",
    "Bond":         "bond",
    "Index":        "index",
}

async def download_exchange(client, exch):
    """Descarga todos los tickers de una bolsa"""
    print(f"  Descargando {exch['label']} ({exch['code']})...", end=" ", flush=True)
    try:
        r = await client.get(
            f"{BASE}/exchange-symbol-list/{exch['code']}",
            params={"api_token": API_KEY, "fmt": "json"},
            timeout=30.0
        )
        if r.status_code != 200:
            print(f"ERROR {r.status_code}")
            return []

        data = r.json()
        if not isinstance(data, list):
            print(f"ERROR: respuesta inesperada")
            return []

        tickers = []
        for item in data:
            code = item.get("Code", "")
            name = item.get("Name", "") or item.get("ShortName", "") or code
            isin = item.get("Isin", "") or ""
            t    = item.get("Type", "") or ""
            curr = item.get("Currency", "") or ""
            exch_code = exch["code"]

            if not code or not name:
                continue

            # Formato símbolo: CODE.EXCHANGE (estilo EODHD)
            symbol = f"{code}.{exch_code}" if exch_code not in ("US", "NASDAQ") else code

            tickers.append({
                "s": symbol,           # symbol
                "n": name[:80],        # name (max 80 chars)
                "e": exch_code,        # exchange
                "t": TYPE_MAP.get(t, t.lower() or "stock"),  # type
                "i": isin[:20] if isin else "",               # isin
                "r": exch["region"],   # region
                "c": curr,             # currency
            })

        print(f"{len(tickers):,} instrumentos")
        return tickers

    except Exception as e:
        print(f"ERROR: {e}")
        return []


async def main():
    print("=" * 60)
    print("EODHD Ticker Downloader")
    print("=" * 60)

    # Crear directorio si no existe
    out_dir = Path("app/data")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "tickers_light.json"

    all_tickers = []
    seen_symbols = set()

    async with httpx.AsyncClient(
        headers={"User-Agent": "Mozilla/5.0"},
        follow_redirects=True
    ) as client:

        # Verificar que la API key funciona
        print("\n[1/3] Verificando API key...")
        r = await client.get(
            f"{BASE}/exchange-symbol-list/US",
            params={"api_token": API_KEY, "fmt": "json"},
            timeout=30.0
        )
        if r.status_code == 401:
            print("❌ API key inválida. Verifica la key en eodhd.com/dashboard")
            return
        elif r.status_code == 402:
            print("❌ Sin créditos de API. El plan gratuito tiene 20 calls/día.")
            return
        elif r.status_code == 200:
            sample = r.json()
            if isinstance(sample, list):
                print(f"✓ API key válida. Muestra USA: {len(sample):,} tickers")
                # Añadir los de USA directamente
                for item in sample:
                    code = item.get("Code", "")
                    name = item.get("Name", "") or code
                    if not code: continue
                    t = item.get("Type", "")
                    ticker = {
                        "s": code,
                        "n": name[:80],
                        "e": "US",
                        "t": TYPE_MAP.get(t, "stock"),
                        "i": item.get("Isin", "") or "",
                        "r": "USA",
                        "c": item.get("Currency", "USD"),
                    }
                    if code not in seen_symbols:
                        seen_symbols.add(code)
                        all_tickers.append(ticker)
            else:
                print(f"⚠ Respuesta inesperada: {str(sample)[:100]}")

        print(f"\n[2/3] Descargando bolsas adicionales...")
        # Descargar el resto de bolsas (saltando US que ya está)
        for exch in EXCHANGES[1:]:  # Skip US, already done
            await asyncio.sleep(0.5)  # pequeño delay entre requests
            tickers = await download_exchange(client, exch)
            for t in tickers:
                if t["s"] not in seen_symbols:
                    seen_symbols.add(t["s"])
                    all_tickers.append(t)

    # Ordenar: primero acciones, luego ETFs, luego fondos
    type_order = {"stock": 0, "etf": 1, "fund": 2, "preferred": 3, "bond": 4, "index": 5}
    all_tickers.sort(key=lambda x: (type_order.get(x["t"], 9), x["s"]))

    print(f"\n[3/3] Guardando {len(all_tickers):,} instrumentos...")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_tickers, f, ensure_ascii=False, separators=(",", ":"))

    size_mb = out_file.stat().st_size / 1024 / 1024
    print(f"✓ Guardado en {out_file} ({size_mb:.1f} MB)")

    # Estadísticas
    print("\n" + "=" * 60)
    print("RESUMEN")
    print("=" * 60)
    by_region = {}
    by_type   = {}
    for t in all_tickers:
        by_region[t["r"]] = by_region.get(t["r"], 0) + 1
        by_type[t["t"]]   = by_type.get(t["t"], 0) + 1

    print("\nPor región:")
    for k, v in sorted(by_region.items(), key=lambda x: -x[1]):
        print(f"  {k:<20} {v:>8,}")

    print("\nPor tipo:")
    for k, v in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"  {k:<20} {v:>8,}")

    print(f"\n✅ TOTAL: {len(all_tickers):,} instrumentos")
    print("\nAhora reinicia el backend con: uvicorn main:app --reload")
    print("El buscador tendrá todos estos instrumentos disponibles.")

asyncio.run(main())
