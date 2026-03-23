from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import date
from uuid import UUID

from src.database import get_db
from src import models, schemas

router = APIRouter(tags=["Resguardos"])


@router.post("/resguardos", response_model=schemas.AsignacionOut)
async def crear_resguardo(
    data: schemas.AsignacionCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Asignacion)
        .where(
            models.Asignacion.id_bien == data.id_bien,
            models.Asignacion.fecha_fin.is_(None),
        )
    )

    if result.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="El bien ya tiene un resguardo activo",
        )

    resguardo = models.Asignacion(
        **data.dict(),
        fecha_inicio=date.today(),
    )

    db.add(resguardo)
    await db.commit()
    await db.refresh(resguardo)

    return resguardo


@router.get("/resguardos", response_model=list[schemas.AsignacionOut])
async def listar_resguardos_activos(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Asignacion)
        .where(models.Asignacion.fecha_fin.is_(None))
    )
    return result.scalars().all()


@router.post("/resguardos/{id_asignacion}/cerrar")
async def cerrar_resguardo(
    id_asignacion: UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Asignacion)
        .where(
            models.Asignacion.id_asignacion == id_asignacion,
            models.Asignacion.fecha_fin.is_(None),
        )
    )

    resguardo = result.scalars().first()

    if not resguardo:
        raise HTTPException(
            status_code=404,
            detail="Resguardo no encontrado o ya cerrado",
        )

    resguardo.fecha_fin = date.today()
    await db.commit()

    return {"status": "resguardo cerrado"}
