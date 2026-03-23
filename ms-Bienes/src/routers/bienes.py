from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from src.database import get_db
from src import models, schemas

router = APIRouter(tags=["Bienes (Activos Físicos)"])


@router.post(
    "/tipos-bien",
    response_model=schemas.TipoBienOut,
    status_code=status.HTTP_201_CREATED,
)
async def crear_tipo_bien(
    tipo: schemas.TipoBienCreate,
    db: AsyncSession = Depends(get_db),
):
    nuevo = models.TipoBien(
        nombre=tipo.nombre,
        tasa_depreciacion_anual=tipo.tasa_depreciacion_anual,
    )

    db.add(nuevo)
    await db.commit()
    await db.refresh(nuevo)

    return nuevo


@router.get(
    "/tipos-bien",
    response_model=List[schemas.TipoBienOut],
)
async def listar_tipos_bien(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(models.TipoBien))
    return result.scalars().all()

@router.post(
    "/bienes",
    response_model=schemas.BienOut,
    status_code=status.HTTP_201_CREATED,
)
async def crear_bien(
    bien: schemas.BienCreate,
    db: AsyncSession = Depends(get_db),
):
    nuevo_bien = models.Bien(
        serie=bien.serie,
        modelo=bien.modelo,
        marca=bien.marca,
        descripcion=bien.descripcion,
        costo=bien.costo,
        fecha_adquisicion=bien.fecha_adquisicion,
    )

    result = await db.execute(
        select(models.TipoBien).where(
            models.TipoBien.id_tipo.in_(bien.tipos_ids)
        )
    )
    tipos = result.scalars().all()

    if len(tipos) != len(bien.tipos_ids):
        raise HTTPException(
            status_code=400,
            detail="Uno o más tipos de bien no existen",
        )

    nuevo_bien.tipos = tipos

    db.add(nuevo_bien)
    await db.commit()
    await db.refresh(nuevo_bien)

    return nuevo_bien


@router.get(
    "/bienes",
    response_model=List[schemas.BienOut],
)
async def listar_bienes(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(models.Bien).where(models.Bien.esta_activo == True)
    )
    return result.scalars().all()
