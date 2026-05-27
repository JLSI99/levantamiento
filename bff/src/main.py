# bff/src/main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx

from src.routers import auth, bienes, resguardos

@asynccontextmanager
async def lifespan(app: FastAPI):
    limits = httpx.Limits(
        max_keepalive_connections=50,
        max_connections=200           
    )

    app.state.http_client = httpx.AsyncClient(limits=limits, timeout=10.0)

    yield

    await app.state.http_client.aclose()

app = FastAPI(
    title="API Gateway / BFF - Sistema de Resguardos", 
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENV") != "production" else None, 
    redoc_url=None
)

origins_env = os.getenv("ALLOWED_ORIGINS", "")
origenes_permitidos = [origin.strip() for origin in origins_env.split(",")] if origins_env else [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(auth.router)
app.include_router(bienes.router)
app.include_router(resguardos.router)

@app.get("/")
async def root():
    return {
        "status": "healthy",
        "component": "BFF / API Gateway",
        "mensaje": "BFF funcionando correctamente"
    }