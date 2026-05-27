import uvicorn
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from src.dependencies.rate_limiter import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from src.routers import usuarios, roles_y_endpoints, autenticacion
import src.auditoria
@asynccontextmanager
async def lifespan(app: FastAPI):
    
    print("🔐 Inicializando Microservicio de Identidad bajo Arquitectura de Capacidades...")
    yield
    print("🛑 Liberando descriptores de archivos, buffers y pools de conexión de forma atómica...")

async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded) -> Response:
    return JSONResponse(
        status_code=429,
        content={
            "error": "Too Many Requests",
            "mensaje": "Has excedido el límite de peticiones permitido para este recurso de identidad.",
            "detalle": str(exc.detail)
        }
    )

app = FastAPI(
    title="Microservicio Usuarios y Autenticación",
    version="1.0.0",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)
app.add_middleware(SlowAPIMiddleware)

origins_str = os.getenv("ALLOWED_ORIGINS")
origenes_permitidos = [origen.strip() for origen in origins_str.split(",")] if origins_str else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos if origenes_permitidos else ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  
)

app.include_router(usuarios.router)
app.include_router(roles_y_endpoints.router)
app.include_router(autenticacion.router)