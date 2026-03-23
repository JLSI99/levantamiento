import os
import uvicorn
from fastapi import FastAPI, Request, Response

from fastapi.middleware.cors import CORSMiddleware
from src.database import engine, Base
from src.routers import bienes

app = FastAPI(title="Microservicio Activos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bienes.router)
@app.on_event("startup")
async def startup_event():
    print("📦 Conectando a BD Activos...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
