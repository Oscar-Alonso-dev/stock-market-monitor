import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from services.finnhub import get_stock_quote, get_stock_profile, search_stocks

app = FastAPI(
    title="Stock Market Monitor",
    description="API para monitorizar precios de bolsa en tiempo real",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=traceback.format_exc())

@app.get("/stocks/{symbol}/profile")
async def profile(symbol: str):
    try:
        return await get_stock_profile(symbol)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=traceback.format_exc())

@app.get("/stocks/search/{query}")
async def search(query: str):
    try:
        return await search_stocks(query)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=traceback.format_exc())