from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from src.database import get_db
from src import models, schemas

router = APIRouter(tags=["Ubicaciones Físicas"])


@router.post(
    "/edificios",
    response_model=schemas.EdificioOut,
)
async def crear_edificio(
    edificio: schemas.EdificioCreate,
    db: AsyncSession = Depends(get_db),
):
    nuevo = models.Edificio(
        nombre=edificio.nombre,
        clave=edificio.clave,
    )
    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)
    return nuevo


@router.get(
    "/edificios",
    response_model=List[schemas.EdificioOut],
)
async def listar_edificios(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Edificio).options(
            selectinload(models.Edificio.aulas)
        )
    )
    return result.scalars().all()


@router.post(
    "/edificios/{id_edificio}/aulas",
    response_model=schemas.AulaOut,
)
async def crear_aula(
    id_edificio: UUID,
    aula: schemas.AulaCreate,
    db: AsyncSession = Depends(get_db),
):
    edificio = await db.get(models.Edificio, id_edificio)
    if not edificio:
        raise HTTPException(
            status_code=404,
            detail="Edificio no encontrado",
        )

    nueva_aula = models.Aula(
        nombre=aula.nombre,
        id_edificio=id_edificio,
    )
    db.add(nueva_aula)
    await db.commit()
    await db.refresh(nueva_aula)

    return nueva_aula
