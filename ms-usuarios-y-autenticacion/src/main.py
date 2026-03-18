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

ROLES_BASE = {
    1: ("Administrador", "Gestiona todo el sistema."),
    2: ("Levantador", "Carga y registra bienes."),
    3: ("Registrador", "Gestiona movimientos."),
    4: ("Revisor", "Acceso de solo lectura."),
    5: ("Resguardante", "Responsable directo de bienes."),
}

@app.on_event("startup")
async def startup_event():
    print("🔐 Iniciando microservicio de Usuarios y Autenticación...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session() as session:
        try:
            result = await session.execute(
                select(models.Rol)
            )
            roles_existentes = {
                rol.id_rol: rol for rol in result.scalars().all()
            }

            nuevos_roles = []

            for id_rol, (nombre, descripcion) in ROLES_BASE.items():
                if id_rol not in roles_existentes:
                    nuevos_roles.append(
                        models.Rol(
                            id_rol=id_rol,
                            nombre_rol=nombre,
                            descripcion=descripcion
                        )
                    )

            if nuevos_roles:
                session.add_all(nuevos_roles)
                await session.commit()
                print(f"🌱 Roles sembrados: {len(nuevos_roles)}")
            else:
                print("✅ Roles base ya existen")

        except IntegrityError as e:
            await session.rollback()
            print("⚠️ Conflicto de integridad al sembrar roles")
            print(e)

        except Exception as e:
            await session.rollback()
            print("❌ Error inesperado durante startup")
            print(e)

    print("✅ Servicio listo")
