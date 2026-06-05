import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from src.database import engine, Base
from src import models

UBICACIONES_SEMILLA = {
    "edificios": [
        {
            "id_edificio": "a0e1b2c3-d4e5-4f6a-bf7a-9e8d7c6b5a41",
            "nombre": "Edificio K (Sistemas Computacionales)",
            "clave": "ED-K"
        }
    ],
    "aulas": [
        {
            "id_aula": "e9d8c7b6-a5f4-4e3d-2c1b-0a9f8e7d6c5b",
            "nombre": "Laboratorio de Cómputo Móvil (K-4)",
            "id_edificio": "a0e1b2c3-d4e5-4f6a-bf7a-9e8d7c6b5a41"
        }
    ],
    "departamentos": [
        {
            "id_departamento": "f1e2d3c4-b5a6-4f7e-8d9c-0b1a2f3e4d5c",
            "nombre": "División de Estudios de Posgrado e Investigación",
            "id_jefe_departamento": None
        }
    ]
}

async def setup():
    print("🛠️  Iniciando Setup Seguro de Base de Datos de Ubicaciones...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Fase 1: Estructura de tablas e índices de ubicaciones listos.")

    async_session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session_factory() as session:
        try:
            print("🌱 Sembrando registros de planta física base...")
            
            # 1. Sembrar Edificios
            for ed in UBICACIONES_SEMILLA["edificios"]:
                stmt = select(models.Edificio).where(models.Edificio.nombre == ed["nombre"])
                res = await session.execute(stmt)
                if not res.scalar():
                    nuevo_ed = models.Edificio(
                        id_edificio=uuid.UUID(ed["id_edificio"]),
                        nombre=ed["nombre"],
                        clave=ed["clave"],
                        is_active=True
                    )
                    session.add(nuevo_ed)
                    print(f"   -> Edificio sembrado: {ed['nombre']}")

            # 2. Sembrar Aulas
            for au in UBICACIONES_SEMILLA["aulas"]:
                stmt = select(models.Aula).where(models.Aula.nombre == au["nombre"])
                res = await session.execute(stmt)
                if not res.scalar():
                    nueva_au = models.Aula(
                        id_aula=uuid.UUID(au["id_aula"]),
                        nombre=au["nombre"],
                        id_edificio=uuid.UUID(au["id_edificio"]),
                        is_active=True
                    )
                    session.add(nueva_au)
                    print(f"   -> Aula sembrada: {au['nombre']}")

            # 3. Sembrar Departamentos
            for dept in UBICACIONES_SEMILLA["departamentos"]:
                stmt = select(models.Departamento).where(models.Departamento.nombre == dept["nombre"])
                res = await session.execute(stmt)
                if not res.scalar():
                    nuevo_dept = models.Departamento(
                        id_departamento=uuid.UUID(dept["id_departamento"]),
                        nombre=dept["nombre"],
                        id_jefe_departamento=dept["id_jefe_departamento"],
                        is_active=True
                    )
                    session.add(nuevo_dept)
                    print(f"   -> Departamento sembrado: {dept['nombre']}")

            await session.commit()
            print("🚀 Infraestructura de datos de planta física inicializada con éxito.")

        except Exception as e:
            await session.rollback()
            print(f"❌ Error crítico insalvable durante el aprovisionamiento de ubicaciones: {e}")
            raise e

if __name__ == "__main__":
    asyncio.run(setup())