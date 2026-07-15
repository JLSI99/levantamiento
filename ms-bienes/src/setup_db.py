import asyncio
import uuid
import datetime
from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from src.database import engine, Base
from src import models
from src.auditoria import Auditoria

UUID_TIPO_COMPUTO = uuid.UUID("b3c3d3e3-f3a3-4b3c-9d3e-1f3a3b3c3d3e")
UUID_TIPO_MOBILIARIO = uuid.UUID("c4d4e4f4-a4b4-4c4d-8e4f-2a4b4c4d4e4f")

BIENES_SEMILLA = {
    "tipos_bien": [
        {
            "id_tipo": uuid.UUID("b3c3d3e3-f3a3-4b3c-9d3e-1f3a3b3c3d3e"),
            "nombre": "Equipo de Cómputo y Tecnologías de Información",
            "tasa_depreciacion_anual": Decimal("30.00")
        },
        {
            "id_tipo": UUID_TIPO_MOBILIARIO,
            "nombre": "Mobiliario y Equipo de Administración",
            "tasa_depreciacion_anual": Decimal("10.00")
        }
    ],
    "bienes": [
        {
            "id_bien": uuid.UUID("11111111-2222-3333-4444-555555555555"),
            "serie": "HP-PROBOOK-2026-XYZ",
            "modelo": "ProBook 450 G10",
            "marca": "HP",
            "descripcion": "Laptop institucional asignada al área de desarrollo de sistemas",
            "costo": Decimal("18500.00"),
            "fecha_adquisicion": datetime.date(2026, 1, 15),
            "tipos_asociados": [UUID_TIPO_COMPUTO]
        },
        {
            "id_bien": uuid.UUID("66666666-7777-8888-9999-000000000000"),
            "serie": "HERMAN-MILLER-AERON-01",
            "modelo": "Aeron Chair Size B",
            "marca": "Herman Miller",
            "descripcion": "Silla ergonómica para estación de trabajo de ingeniería",
            "costo": Decimal("24999.00"),
            "fecha_adquisicion": datetime.date(2026, 2, 20),
            "tipos_asociados": [UUID_TIPO_MOBILIARIO]
        }
    ]
}

async def setup():
    print("🛠️  Iniciando Setup Seguro y Jerárquico de Base de Datos de Bienes...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Fase 1: Estructura relacional verificada en el motor.")

    async_session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session_factory() as session:
        try:

            print("🌱 Sembrando catálogo base de tipos de bien...")
            tipos_en_memoria = {}
            
            for t_seed in BIENES_SEMILLA["tipos_bien"]:
                stmt = select(models.TipoBien).where(models.TipoBien.id_tipo == t_seed["id_tipo"])
                res = await session.execute(stmt)
                tipo_db = res.scalar()
                
                if not tipo_db:
                    tipo_db = models.TipoBien(
                        id_tipo=t_seed["id_tipo"],
                        nombre=t_seed["nombre"],
                        tasa_depreciacion_anual=t_seed["tasa_depreciacion_anual"],
                        esta_activo=True
                    )
                    session.add(tipo_db)
                    print(f"   -> Tipo creado: {t_seed['nombre']}")
                else:
                    print(f"   -> Tipo preexistente detectado: {t_seed['nombre']}")
                
                tipos_en_memoria[t_seed["id_tipo"]] = tipo_db

            await session.flush()

            print("🌱 Sembrando registros de bienes e inventario institucional...")
            for b_seed in BIENES_SEMILLA["bienes"]:
                stmt = select(models.Bien).where(models.Bien.id_bien == b_seed["id_bien"])
                res = await session.execute(stmt)
                bien_db = res.scalar()
                
                if not bien_db:
                    nuevo_bien = models.Bien(
                        id_bien=b_seed["id_bien"],
                        serie=b_seed["serie"],
                        modelo=b_seed["modelo"],
                        marca=b_seed["marca"],
                        descripcion=b_seed["descripcion"],
                        costo=b_seed["costo"],
                        fecha_adquisicion=b_seed["fecha_adquisicion"],
                        esta_activo=True
                    )
                    
                    for tipo_uuid in b_seed["tipos_asociados"]:
                        instancia_tipo = tipos_en_memoria.get(tipo_uuid)
                        if instancia_tipo:
                            nuevo_bien.tipos.append(instancia_tipo)
                    
                    session.add(nuevo_bien)
                    print(f"   -> Bien sembrado: {b_seed['marca']} {b_seed['modelo']} (S/N: {b_seed['serie']})")
                else:
                    print(f"   -> Bien preexistente omitido de forma segura (S/N: {b_seed['serie']})")

            await session.commit()
            print("🚀 Infraestructura de datos y catálogo de activos inicializados con éxito.")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error crítico durante el aprovisionamiento de bienes: {e}")
            raise e

if __name__ == "__main__":
    asyncio.run(setup())