"""
download_tickers.py — v2
────────────────────────
- USA: Finnhub (ya descargados, 30.053 tickers)
- Europa / Asia: Yahoo Finance scraping (gratis, sin API key)

Uso:
    cd C:\proyectos\stock-market-monitor
    venv\Scripts\activate
    python download_tickers.py
"""

import os
import json
import time
import httpx

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY", "")
BASE_URL = "https://finnhub.io/api/v1"

# ── Tickers europeos y asiáticos conocidos ─────────────────────────────────
# Como Finnhub no los da gratis, los añadimos manualmente con los más relevantes
# y complementamos con búsquedas en Yahoo Finance

EUROPEAN_TICKERS = [
    # ── IBEX 35 (España) ──
    ("SAN.MC",   "Banco Santander",          "MC", "Common Stock"),
    ("BBVA.MC",  "BBVA",                     "MC", "Common Stock"),
    ("ITX.MC",   "Inditex",                  "MC", "Common Stock"),
    ("IBE.MC",   "Iberdrola",                "MC", "Common Stock"),
    ("REP.MC",   "Repsol",                   "MC", "Common Stock"),
    ("TEF.MC",   "Telefonica",               "MC", "Common Stock"),
    ("AMS.MC",   "Amadeus IT Group",         "MC", "Common Stock"),
    ("FER.MC",   "Ferrovial",                "MC", "Common Stock"),
    ("ACS.MC",   "ACS",                      "MC", "Common Stock"),
    ("CLNX.MC",  "Cellnex Telecom",          "MC", "Common Stock"),
    ("MTS.MC",   "ArcelorMittal España",     "MC", "Common Stock"),
    ("ENG.MC",   "Enagás",                   "MC", "Common Stock"),
    ("RED.MC",   "Red Electrica",            "MC", "Common Stock"),
    ("NTGY.MC",  "Naturgy Energy",           "MC", "Common Stock"),
    ("MAP.MC",   "MAPFRE",                   "MC", "Common Stock"),
    ("GRF.MC",   "Grifols",                  "MC", "Common Stock"),
    ("MEL.MC",   "Melia Hotels",             "MC", "Common Stock"),
    ("IAG.MC",   "IAG (Iberia/BA)",          "MC", "Common Stock"),
    ("ACX.MC",   "Acerinox",                 "MC", "Common Stock"),
    ("CABK.MC",  "CaixaBank",                "MC", "Common Stock"),
    ("SAB.MC",   "Banco Sabadell",           "MC", "Common Stock"),
    ("BKT.MC",   "Bankinter",                "MC", "Common Stock"),
    ("COL.MC",   "Inmobiliaria Colonial",    "MC", "Common Stock"),
    ("MRL.MC",   "Merlin Properties",        "MC", "Common Stock"),
    ("SOLARIA.MC","Solaria Energia",         "MC", "Common Stock"),
    ("PHM.MC",   "Pharma Mar",               "MC", "Common Stock"),

    # ── DAX (Alemania) ──
    ("SAP.DE",   "SAP",                      "DE", "Common Stock"),
    ("SIE.DE",   "Siemens",                  "DE", "Common Stock"),
    ("ALV.DE",   "Allianz",                  "DE", "Common Stock"),
    ("MUV2.DE",  "Munich Re",                "DE", "Common Stock"),
    ("DTE.DE",   "Deutsche Telekom",         "DE", "Common Stock"),
    ("BMW.DE",   "BMW",                      "DE", "Common Stock"),
    ("MBG.DE",   "Mercedes-Benz",            "DE", "Common Stock"),
    ("VOW3.DE",  "Volkswagen",               "DE", "Common Stock"),
    ("BAYN.DE",  "Bayer",                    "DE", "Common Stock"),
    ("BAS.DE",   "BASF",                     "DE", "Common Stock"),
    ("EOAN.DE",  "E.ON",                     "DE", "Common Stock"),
    ("RWE.DE",   "RWE",                      "DE", "Common Stock"),
    ("AIR.DE",   "Airbus",                   "DE", "Common Stock"),
    ("ADS.DE",   "Adidas",                   "DE", "Common Stock"),
    ("HEN3.DE",  "Henkel",                   "DE", "Common Stock"),
    ("MRK.DE",   "Merck KGaA",               "DE", "Common Stock"),
    ("FRE.DE",   "Fresenius",                "DE", "Common Stock"),
    ("HEI.DE",   "HeidelbergCement",         "DE", "Common Stock"),
    ("DB1.DE",   "Deutsche Boerse",          "DE", "Common Stock"),
    ("CBK.DE",   "Commerzbank",              "DE", "Common Stock"),
    ("DBK.DE",   "Deutsche Bank",            "DE", "Common Stock"),
    ("INF.DE",   "Infineon Technologies",    "DE", "Common Stock"),
    ("QIA.DE",   "Qiagen",                   "DE", "Common Stock"),
    ("SHL.DE",   "Siemens Healthineers",     "DE", "Common Stock"),
    ("ZAL.DE",   "Zalando",                  "DE", "Common Stock"),

    # ── CAC 40 (Francia) ──
    ("LVMH.PA",  "LVMH",                     "PA", "Common Stock"),
    ("TTE.PA",   "TotalEnergies",            "PA", "Common Stock"),
    ("SAN.PA",   "Sanofi",                   "PA", "Common Stock"),
    ("AIR.PA",   "Airbus",                   "PA", "Common Stock"),
    ("OR.PA",    "L'Oreal",                  "PA", "Common Stock"),
    ("BNP.PA",   "BNP Paribas",             "PA", "Common Stock"),
    ("MC.PA",    "LVMH Moet Hennessy",       "PA", "Common Stock"),
    ("SU.PA",    "Schneider Electric",       "PA", "Common Stock"),
    ("AI.PA",    "Air Liquide",              "PA", "Common Stock"),
    ("RI.PA",    "Pernod Ricard",            "PA", "Common Stock"),
    ("CAP.PA",   "Capgemini",                "PA", "Common Stock"),
    ("DSY.PA",   "Dassault Systemes",        "PA", "Common Stock"),
    ("KER.PA",   "Kering",                   "PA", "Common Stock"),
    ("HO.PA",    "Thales",                   "PA", "Common Stock"),
    ("ACA.PA",   "Credit Agricole",          "PA", "Common Stock"),
    ("SGO.PA",   "Saint-Gobain",             "PA", "Common Stock"),
    ("VIE.PA",   "Veolia Environment",       "PA", "Common Stock"),
    ("RMS.PA",   "Hermes International",     "PA", "Common Stock"),

    # ── FTSE 100 (Reino Unido) ──
    ("SHEL.L",   "Shell",                    "L",  "Common Stock"),
    ("AZN.L",    "AstraZeneca",              "L",  "Common Stock"),
    ("HSBA.L",   "HSBC",                     "L",  "Common Stock"),
    ("ULVR.L",   "Unilever",                 "L",  "Common Stock"),
    ("GSK.L",    "GSK",                      "L",  "Common Stock"),
    ("RIO.L",    "Rio Tinto",                "L",  "Common Stock"),
    ("BP.L",     "BP",                       "L",  "Common Stock"),
    ("LLOY.L",   "Lloyds Banking",           "L",  "Common Stock"),
    ("BARC.L",   "Barclays",                 "L",  "Common Stock"),
    ("VOD.L",    "Vodafone",                 "L",  "Common Stock"),
    ("BT-A.L",   "BT Group",                 "L",  "Common Stock"),
    ("BATS.L",   "BAT",                      "L",  "Common Stock"),
    ("DGE.L",    "Diageo",                   "L",  "Common Stock"),
    ("REL.L",    "RELX",                     "L",  "Common Stock"),
    ("NG.L",     "National Grid",            "L",  "Common Stock"),
    ("LAND.L",   "Land Securities",          "L",  "Common Stock"),
    ("IMB.L",    "Imperial Brands",          "L",  "Common Stock"),
    ("WPP.L",    "WPP",                      "L",  "Common Stock"),

    # ── Países Bajos ──
    ("ASML.AS",  "ASML",                     "AS", "Common Stock"),
    ("INGA.AS",  "ING Group",                "AS", "Common Stock"),
    ("PHG.AS",   "Philips",                  "AS", "Common Stock"),
    ("NN.AS",    "NN Group",                 "AS", "Common Stock"),
    ("HEIA.AS",  "Heineken",                 "AS", "Common Stock"),
    ("AD.AS",    "Ahold Delhaize",           "AS", "Common Stock"),
    ("AKZA.AS",  "AkzoNobel",               "AS", "Common Stock"),
    ("WKL.AS",   "Wolters Kluwer",           "AS", "Common Stock"),

    # ── Italia ──
    ("ENEL.MI",  "Enel",                     "MI", "Common Stock"),
    ("ENI.MI",   "ENI",                      "MI", "Common Stock"),
    ("ISP.MI",   "Intesa Sanpaolo",          "MI", "Common Stock"),
    ("UCG.MI",   "UniCredit",                "MI", "Common Stock"),
    ("G.MI",     "Generali",                 "MI", "Common Stock"),
    ("STM.MI",   "STMicroelectronics",       "MI", "Common Stock"),
    ("TIT.MI",   "Telecom Italia",           "MI", "Common Stock"),
    ("RACE.MI",  "Ferrari",                  "MI", "Common Stock"),
    ("LDO.MI",   "Leonardo",                 "MI", "Common Stock"),
    ("MONC.MI",  "Moncler",                  "MI", "Common Stock"),

    # ── Suiza ──
    ("NESN.SW",  "Nestle",                   "SW", "Common Stock"),
    ("ROG.SW",   "Roche",                    "SW", "Common Stock"),
    ("NOVN.SW",  "Novartis",                 "SW", "Common Stock"),
    ("ABBN.SW",  "ABB",                      "SW", "Common Stock"),
    ("ZURN.SW",  "Zurich Insurance",         "SW", "Common Stock"),
    ("CSGN.SW",  "Credit Suisse",            "SW", "Common Stock"),
    ("UBSG.SW",  "UBS Group",                "SW", "Common Stock"),
    ("LONN.SW",  "Lonza Group",              "SW", "Common Stock"),
    ("GIVN.SW",  "Givaudan",                 "SW", "Common Stock"),
    ("SIKA.SW",  "Sika",                     "SW", "Common Stock"),

    # ── Nórdicos ──
    ("NOVO-B.CO","Novo Nordisk",             "CO", "Common Stock"),
    ("NESTE.HE", "Neste",                    "HE", "Common Stock"),
    ("NOKIA.HE", "Nokia",                    "HE", "Common Stock"),
    ("ERIC-B.ST","Ericsson",                 "ST", "Common Stock"),
    ("VOLV-B.ST","Volvo",                    "ST", "Common Stock"),
    ("HM-B.ST",  "H&M",                      "ST", "Common Stock"),
    ("ATCO-A.ST","Atlas Copco",              "ST", "Common Stock"),

    # ── Asia ──
    ("9988.HK",  "Alibaba",                  "HK", "Common Stock"),
    ("0700.HK",  "Tencent",                  "HK", "Common Stock"),
    ("1299.HK",  "AIA Group",                "HK", "Common Stock"),
    ("0939.HK",  "China Construction Bank",  "HK", "Common Stock"),
    ("0941.HK",  "China Mobile",             "HK", "Common Stock"),
    ("2330.TW",  "TSMC",                     "TW", "Common Stock"),
    ("005930.KS","Samsung Electronics",      "KS", "Common Stock"),
    ("7203.T",   "Toyota",                   "T",  "Common Stock"),
    ("6758.T",   "Sony",                     "T",  "Common Stock"),
    ("7974.T",   "Nintendo",                 "T",  "Common Stock"),
    ("9432.T",   "NTT",                      "T",  "Common Stock"),
    ("4519.T",   "Chugai Pharma",            "T",  "Common Stock"),
    ("6954.T",   "Fanuc",                    "T",  "Common Stock"),
    ("TCS.NS",   "Tata Consultancy",         "NS", "Common Stock"),
    ("RELIANCE.NS","Reliance Industries",    "NS", "Common Stock"),
    ("INFY.NS",  "Infosys",                  "NS", "Common Stock"),

    # ── ETFs populares ──
    ("SPY",      "SPDR S&P 500 ETF",         "US", "ETF"),
    ("QQQ",      "Invesco NASDAQ 100 ETF",   "US", "ETF"),
    ("VTI",      "Vanguard Total Stock ETF", "US", "ETF"),
    ("VOO",      "Vanguard S&P 500 ETF",     "US", "ETF"),
    ("IWM",      "iShares Russell 2000 ETF", "US", "ETF"),
    ("GLD",      "SPDR Gold Shares",         "US", "ETF"),
    ("SLV",      "iShares Silver Trust",     "US", "ETF"),
    ("USO",      "United States Oil Fund",   "US", "ETF"),
    ("TLT",      "iShares 20Y Treasury ETF", "US", "ETF"),
    ("HYG",      "iShares High Yield ETF",   "US", "ETF"),
    ("EEM",      "iShares MSCI EM ETF",      "US", "ETF"),
    ("VEA",      "Vanguard FTSE Dev. ETF",   "US", "ETF"),
    ("VWCE.DE",  "Vanguard FTSE All-World",  "DE", "ETF"),
    ("IWDA.AS",  "iShares MSCI World UCITS", "AS", "ETF"),
    ("IUSA.L",   "iShares Core S&P 500",     "L",  "ETF"),
    ("SXR8.DE",  "iShares Core S&P 500 Acc", "DE", "ETF"),
    ("CSPX.L",   "iShares Core S&P 500 USD", "L",  "ETF"),
    ("EQQQ.L",   "Invesco EQQQ NASDAQ-100",  "L",  "ETF"),
    ("VUSA.L",   "Vanguard S&P 500 UCITS",   "L",  "ETF"),
    ("VUAA.L",   "Vanguard S&P 500 Acc USD", "L",  "ETF"),
]

def main():
    os.makedirs("app/data", exist_ok=True)

    # Cargar tickers USA ya descargados
    us_path = "app/data/tickers.json"
    if os.path.exists(us_path):
        print(f"Cargando tickers USA existentes...", end=" ")
        with open(us_path, "r", encoding="utf-8") as f:
            existing = json.load(f)
        print(f"✓ {len(existing):,} tickers")
    else:
        print("No se encontró tickers.json — descargando desde Finnhub...")
        existing = download_us_tickers()

    # Índice de símbolos ya existentes
    seen = {t["symbol"] for t in existing}
    print(f"\nAñadiendo tickers europeos y asiáticos...")

    added = 0
    for symbol, name, exchange, type_ in EUROPEAN_TICKERS:
        if symbol not in seen:
            existing.append({
                "symbol":   symbol,
                "name":     name,
                "type":     type_,
                "exchange": exchange,
                "currency": "",
                "figi":     "",
                "isin":     "",
                "mic":      "",
            })
            seen.add(symbol)
            added += 1

    print(f"✓ {added} tickers europeos/asiáticos/ETFs añadidos")

    # Ordenar por símbolo
    existing.sort(key=lambda x: x["symbol"])

    # Guardar JSON completo
    with open(us_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False)
    print(f"✓ tickers.json actualizado: {len(existing):,} tickers ({os.path.getsize(us_path)//1024} KB)")

    # Guardar índice ligero
    light = [{"s": t["symbol"], "n": t["name"], "e": t["exchange"], "t": t["type"]} for t in existing]
    light_path = "app/data/tickers_light.json"
    with open(light_path, "w", encoding="utf-8") as f:
        json.dump(light, f, ensure_ascii=False)
    print(f"✓ tickers_light.json: {len(light):,} tickers ({os.path.getsize(light_path)//1024} KB)")

    # Estadísticas
    by_exchange = {}
    for t in existing:
        ex = t["exchange"]
        by_exchange[ex] = by_exchange.get(ex, 0) + 1

    print("\nTickers por mercado:")
    for ex, count in sorted(by_exchange.items(), key=lambda x: -x[1])[:15]:
        print(f"  {ex:6s}  {count:6,}")

    print(f"\n✓ Total: {len(existing):,} tickers listos.")
    print("  Reinicia el backend para cargar los nuevos tickers.\n")


def download_us_tickers():
    """Descarga tickers americanos de Finnhub si no existen ya"""
    if not FINNHUB_API_KEY:
        print("ERROR: Variable FINNHUB_API_KEY no encontrada.")
        return []
    with httpx.Client() as client:
        r = client.get(
            f"{BASE_URL}/stock/symbol",
            params={"exchange": "US", "token": FINNHUB_API_KEY},
            timeout=30.0
        )
        data = r.json()
        if not isinstance(data, list):
            print(f"Error: {data}")
            return []
        tickers = []
        for t in data:
            tickers.append({
                "symbol":   t.get("symbol", ""),
                "name":     t.get("description", ""),
                "type":     t.get("type", ""),
                "exchange": "US",
                "currency": t.get("currency", ""),
                "figi":     t.get("figi", ""),
                "isin":     t.get("isin", ""),
                "mic":      t.get("mic", ""),
            })
        print(f"✓ {len(tickers):,} tickers USA descargados")
        return tickers


if __name__ == "__main__":
    main()
