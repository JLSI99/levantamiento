from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.routers import resguardos_vista

app = FastAPI(
    title="BFF - Sistema de Control Patrimonial",
    description="Backend for Frontend para orquestar microservicios",
    version="1.0.0"
)

# Configuración básica de CORS (ajústalo a la URL de tu frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir los routers
app.include_router(resguardos_vista.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "BFF Orquestador"}