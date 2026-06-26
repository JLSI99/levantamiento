import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from src.database import engine, Base
from src import models
from src.auditoria import Auditoria

PERSONAS_SEMILLA = [
    {
        "id_persona": "1ed3fc1c-ccf8-4b12-a6c8-e3cd77b8a001",
        "nombres": "Persona1",
        "apellidos": "Apellidos1",
        "curp": "GOME900101HDFRRN01"
    },
    {
        "id_persona": "2bd2ec1b-bbf7-4b11-a5c7-e2cd66b7a002",
        "nombres": "Persona2",
        "apellidos": "Apellidos2",
        "curp": "LEVA910202HDFRRN02"
    },
    {
        "id_persona": "3ad1db1a-aaf6-4b10-a4c6-e1cd55b6a003",
        "nombres": "Persona3",
        "apellidos": "Apellidos3",
        "curp": "REGI920303HDFRRN03"
    },
    {
        "id_persona": "2bd2ec1b-bbf7-4b11-a5c7-e2cd66b7a004",
        "nombres": "Persona4",
        "apellidos": "Apellidos4",
        "curp": "REVI930404HDFRRN04"
    },
    {
        "id_persona": "3ad1db1a-aaf6-4b10-a4c6-e1cd55b6a005",
        "nombres": "Persona5",
        "apellidos": "Apellidos5",
        "curp": "RESG940505HDFRRN05"
    }
]

async def setup():
    print("🛠️  Iniciando Setup Seguro de Base de Datos de Personas...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Fase 1: Estructura de tablas e índices de personas listos.")

    async_session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session_factory() as session:
        try:
            print("🌱 Sembrando registros demográficos base...")
            for p in PERSONAS_SEMILLA:
                stmt = select(models.Persona).where(models.Persona.curp == p["curp"])
                res = await session.execute(stmt)
                
                if not res.scalar():
                    nueva_persona = models.Persona(
                        id_persona=uuid.UUID(p["id_persona"]),
                        nombres=p["nombres"],
                        apellidos=p["apellidos"],
                        curp=p["curp"],
                        is_active=True
                    )
                    session.add(nueva_persona)
                    print(f"   -> Registro inyectado de forma segura: {p['nombres']} ({p['curp']})")
            
            await session.commit()
            print("🚀 El padrón de personas ha sido inicializado y sembrado con éxito.")

        except Exception as e:
            await session.rollback()
            print(f"❌ Error crítico insalvable durante el aprovisionamiento de personas: {e}")
            raise e

if __name__ == "__main__":
    asyncio.run(setup())