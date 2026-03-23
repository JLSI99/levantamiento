from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.database import get_db
from src import models, schemas

router = APIRouter(tags=["Departamentos"])


@router.post(
    "/departamentos",
    response_model=schemas.DepartamentoOut,
)
async def crear_departamento(
    depto: schemas.DepartamentoCreate,
    db: AsyncSession = Depends(get_db),
):
    nuevo = models.Departamento(
        nombre=depto.nombre,
        id_jefe_departamento=depto.id_jefe_departamento,
    )
    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)
    return nuevo


@router.get(
    "/departamentos",
    response_model=List[schemas.DepartamentoOut],
)
async def listar_departamentos(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(models.Departamento))
    return result.scalars().all()
