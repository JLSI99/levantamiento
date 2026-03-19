import os
import uvicorn
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from src.dependencies.rate_limiter import limiter

from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from src.database import engine, Base

import src.auditoria

from src.routers import personas

async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded)-> Response:
    return JSONResponse(
        status_code=429,
        content={
            "error":"rate Limit Exceed",
            "mensaje": "Servicio de Personas: Límite de peticiones alcanzado.",
            "detalle": str(exc.detail)
        }
    )

app = FastAPI(title="Microservicio Personas")

app.state.limiter=limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)

origins_str=os.getenv("ALLOW_ORIGINS")

origenes_permitidos=[origen.strip() for origen in origins_str.split(",")] if origins_str else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(personas.router)

@app.on_event("startup")
async def startup_event():
    print("🧠 Inicializando microservicio de Personas...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas creadas y servicio listo")