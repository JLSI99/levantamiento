import uvicorn
import os
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from src.dependencies.rate_limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.database import engine, Base
from src import models
from src.routers import usuarios, roles_y_endpoints, autenticacion

import src.auditoria

async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
    return JSONResponse(
        status_code=429,
        content={
            "error": "Too Many Request",
            "mensaje":"has excedido el límite de peticiones permitido para este recurso.",
            "detalle": str(exc.detail)
        }
    )

app = FastAPI(
    title="Microservicio Usuarios y Autenticación",
    version="1.0.0"
)

app.state.limiter= limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)

origins_str=os.getenv("ALLOWED_ORIGINS")

origenes_permitidos=[origen.strip() for origen in origins_str.split(",")]if origins_str else[]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(usuarios.router)
app.include_router(roles_y_endpoints.router)
app.include_router(autenticacion.router)

@app.on_event("startup")
async def startup_event():
    print("🔐 Iniciando microservicio de Usuarios y Autenticación levantado exitosamente.")
