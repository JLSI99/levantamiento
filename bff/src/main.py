import os
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bff_main")

from src.routers import auth, bienes, resguardos, admin, ubicaciones

@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info("Inicializando el Pool de conexiones asíncronas hacia los microservicios...")
    
    limits = httpx.Limits(
        max_keepalive_connections=int(os.getenv("HTTP_POOL_MAX_KEEPALIVE", "100")),
        max_connections=int(os.getenv("HTTP_POOL_MAX_CONNECTIONS", "200"))
    )
    
    timeout_val = float(os.getenv("TIMEOUT_MICROSERVICIOS", "2.0"))
    timeout_config = httpx.Timeout(
        timeout=timeout_val,   
        connect=2.0,           
        read=5.0,             
        write=2.0              
    )

    app.state.http_client = httpx.AsyncClient(
        limits=limits, 
        timeout=timeout_config,
        trust_env=False     
    )

    yield

    logger.info("Cerrando el Pool de conexiones asíncronas en el BFF (Graceful Shutdown)...")
    await app.state.http_client.aclose()

ENV = os.getenv("ENV", "development")
app = FastAPI(
    title="API Gateway / BFF - Sistema de Resguardos ITSC",
    description="Capa perimetral unificada para agregación de datos, control CapBAC y orquestación de inventarios.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if ENV != "production" else None, 
    redoc_url=None
)
# --------------------------------------------------------------------------
# MANEJADORES GLOBALES DE EXCEPCIONES DE RED (PERÍMETRO DE RESILIENCIA)
# --------------------------------------------------------------------------
@app.exception_handler(httpx.TimeoutException)
async def bff_timeout_exception_handler(request: Request, exc: httpx.TimeoutException):
    logger.error(f"Gateway Timeout detectado en el recurso: {request.url.path} | Error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        content={
            "error": "Gateway Timeout",
            "message": "El microservicio interno no respondió dentro del límite de tiempo establecido.",
            "path": request.url.path
        }
    )

@app.exception_handler(httpx.NetworkError)
async def bff_network_exception_handler(request: Request, exc: httpx.NetworkError):
    logger.critical(f"Falla de conectividad (Bad Gateway) al procesar {request.url.path} | Error: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_502_BAD_GATEWAY,
        content={
            "error": "Bad Gateway",
            "message": "No fue posible establecer conexión con el servicio interno de datos.",
            "path": request.url.path
        }
    )
# --------------------------------------------------------------------------
# CONFIGURACIÓN DEL CONTROL DE ACCESO INTER-ORIGEN (CORS)
# --------------------------------------------------------------------------
origins_env = os.getenv("ALLOWED_ORIGINS", "")

if origins_env:
    origenes_permitidos = [origin.strip() for origin in origins_env.split(",") if origin.strip()]
else:
    origenes_permitidos = [
        "http://localhost:8080",   
        "http://127.0.0.1:8080",  
        "http://localhost:5173",    
        "http://localhost"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"] # Necesario si descargas reportes o resguardos en PDF/Excel
)
# --------------------------------------------------------------------------
# REGISTRO DE ENRUTADORES CON PREFIJOS SEMÁNTICOS Y VERSIONAMIENTO
# --------------------------------------------------------------------------
API_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=f"{API_PREFIX}/auth", tags=["Autenticación & Sesión"])
app.include_router(bienes.router, prefix=f"{API_PREFIX}/bienes", tags=["Gestión de Bienes"])
app.include_router(resguardos.router, prefix=f"{API_PREFIX}/resguardos", tags=["Control de Resguardos"])
app.include_router(ubicaciones.router, prefix=f"{API_PREFIX}/ubicaciones", tags=["Infraestructura y Ubicaciones"])
app.include_router(admin.router, prefix=f"{API_PREFIX}/admin", tags=["Administración del Sistema"])


@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "healthy",
        "component": "BFF / API Gateway unificado",
        "instancia": "ITSC-Ecosistema-Universitario-2026",
        "environment": ENV,
        "cors_active_origins": origenes_permitidos
    }