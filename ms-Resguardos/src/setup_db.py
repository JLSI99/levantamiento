import asyncio
import uuid
import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from src.database import engine, Base
from src import models
from src.auditoria import Auditoria

UUID_BIEN_LAPTOP = uuid.UUID("11111111-2222-3333-4444-555555555555")
UUID_AULA_INGENIERIA = uuid.UUID("fa111111-b222-c333-d444-e55555555555")
UUID_EDIFICIO_C = uuid.UUID("ec333333-4444-5555-6666-777777777777")
UUID_DEP_SISTEMAS = uuid.UUID("de999999-0000-1111-2222-333333333333")

CURP_DESARROLLADOR = "GODE561231HDFRRN09"

RESGUARDOS_SEMILLA = [
    {
        "id_asignacion": uuid.UUID("99999999-8888-7777-6666-555555555555"),
        "id_bien": UUID_BIEN_LAPTOP,
        "curp": CURP_DESARROLLADOR,
        "id_aula": UUID_AULA_INGENIERIA,
        "id_edificio": UUID_EDIFICIO_C,
        "id_departamento": UUID_DEP_SISTEMAS,
        "fecha_inicio": datetime.date(2026, 1, 16),
        "esta_activo": True,
    }
]

async def setup():
    print("🛠️  Iniciando setup idempotente de base de datos de resguardos...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Esquema y estructuras verificados.")

    async_session_factory = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_factory() as session:
        try:
            print("🌱 Sembrando resguardos históricos iniciales...")

            for seed in RESGUARDOS_SEMILLA:
                stmt = select(models.Asignacion).where(
                    models.Asignacion.id_asignacion == seed["id_asignacion"]
                )
                result = await session.execute(stmt)
                existente = result.scalar_one_or_none()

                if existente:
                    print(
                        f"   -> Resguardo ya existente: {seed['id_asignacion']}"
                    )
                    continue

                nueva = models.Asignacion(
                    id_asignacion=seed["id_asignacion"],
                    id_bien=seed["id_bien"],
                    curp=seed["curp"],
                    id_aula=seed["id_aula"],
                    id_edificio=seed["id_edificio"],
                    id_departamento=seed["id_departamento"],
                    fecha_inicio=seed["fecha_inicio"],
                    esta_activo=seed["esta_activo"],
                )

                session.add(nueva)
                print(
                    f"   -> Resguardo sembrado para bien {seed['id_bien']}"
                )

            await session.commit()
            print("🚀 Setup de resguardos finalizado correctamente.")

        except Exception as e:
            await session.rollback()
            print(f"❌ Error crítico durante el setup: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(setup())