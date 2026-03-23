from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from typing import List

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_authz, validate_jwt_token
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    tags=["Bienes (Activos Físicos)"],
    dependencies=[Depends(require_authz)]
)

@router.post("/tipos-bien", response_model=schemas.TipoBienOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def crear_tipo_bien(
    request: Request,
    tipo: schemas.TipoBienCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    nuevo = models.TipoBien(
        nombre=tipo.nombre,
        tasa_depreciacion_anual=tipo.tasa_depreciacion_anual,
    )
    db.add(nuevo)
    
    try:
        await db.commit()
        await db.refresh(nuevo)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Ya existe un tipo de bien con este nombre.")

    return nuevo


@router.get("/tipos-bien", response_model=schemas.TipoBienPaginatedOut)
@limiter.limit("30/minute")
async def listar_tipos_bien(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    query_count = select(func.count()).select_from(models.TipoBien)
    total = await db.scalar(query_count)

    query_data = select(models.TipoBien).offset(offset).limit(limit)
    result = await db.execute(query_data)
    
    return {"total": total, "limit": limit, "offset": offset, "data": result.scalars().all()}


@router.post("/bienes", response_model=schemas.BienOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def crear_bien(
    request: Request,
    bien: schemas.BienCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    # Mass assignment prevention ya implementada por ti
    nuevo_bien = models.Bien(
        serie=bien.serie,
        modelo=bien.modelo,
        marca=bien.marca,
        descripcion=bien.descripcion,
        costo=bien.costo,
        fecha_adquisicion=bien.fecha_adquisicion,
    )

    result = await db.execute(select(models.TipoBien).where(models.TipoBien.id_tipo.in_(bien.tipos_ids)))
    tipos = result.scalars().all()

    if len(tipos) != len(bien.tipos_ids):
        raise HTTPException(status_code=400, detail="Uno o más tipos de bien no existen")

    nuevo_bien.tipos = tipos
    db.add(nuevo_bien)
    
    try:
        await db.commit()
        await db.refresh(nuevo_bien)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Ya existe un bien con este número de serie.")

    return nuevo_bien


@router.get("/bienes", response_model=schemas.BienPaginatedOut)
@limiter.limit("30/minute")
async def listar_bienes(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    query_count = select(func.count()).select_from(models.Bien).where(models.Bien.esta_activo == True)
    total = await db.scalar(query_count)

    query_data = select(models.Bien).where(models.Bien.esta_activo == True).offset(offset).limit(limit)
    result = await db.execute(query_data)
    
    return {"total": total, "limit": limit, "offset": offset, "data": result.scalars().all()}