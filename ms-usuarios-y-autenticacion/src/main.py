import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database import engine, Base
from src.routers import usuarios, roles_y_endpoints, autenticacion

app = FastAPI(title="Microservicio Usuarios y Autenticación")

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
    print("🔐 Iniciando microservicio de Usuarios y Autenticación...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Servicio listo")