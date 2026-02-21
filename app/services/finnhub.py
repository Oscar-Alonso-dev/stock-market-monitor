import httpx
import os

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY")
BASE_URL = "https://finnhub.io/api/v1"

async def get_stock_quote(symbol: str):
    """Obtiene el precio actual de una accion"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/quote",
            params={"symbol": symbol.upper(), "token": FINNHUB_API_KEY}
        )
        data = response.json()
        return {
            "symbol": symbol.upper(),
            "current_price": data["c"],
            "change": data["d"],
            "change_percent": data["dp"],
            "high": data["h"],
            "low": data["l"],
            "open": data["o"],
            "previous_close": data["pc"]
        }

async def get_stock_profile(symbol: str):
    """Obtiene informacion de la empresa"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/stock/profile2",
            params={"symbol": symbol.upper(), "token": FINNHUB_API_KEY}
        )
        return response.json()

async def search_stocks(query: str):
    """Busca acciones por nombre o simbolo"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/search",
            params={"q": query, "token": FINNHUB_API_KEY}
        )
        return response.json()