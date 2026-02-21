import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.finnhub import (
    get_stock_quote, get_stock_profile, search_stocks,
    get_stock_metrics, get_stock_earnings,
    get_analyst_recommendations, get_company_news
)

app = FastAPI(
    title="Stock Market Monitor",
    description="API para monitorizar precios de bolsa en tiempo real",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:30080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/stocks/{symbol}/quote")
async def quote(symbol: str):
    try:
        return await get_stock_quote(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/{symbol}/profile")
async def profile(symbol: str):
    try:
        return await get_stock_profile(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/{symbol}/metrics")
async def metrics(symbol: str):
    try:
        return await get_stock_metrics(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/{symbol}/earnings")
async def earnings(symbol: str):
    try:
        return await get_stock_earnings(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/{symbol}/recommendations")
async def recommendations(symbol: str):
    try:
        return await get_analyst_recommendations(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/{symbol}/news")
async def news(symbol: str):
    try:
        return await get_company_news(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stocks/search/{query}")
async def search(query: str):
    try:
        return await search_stocks(query)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))