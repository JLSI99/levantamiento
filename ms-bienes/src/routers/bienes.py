from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_capability
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    prefix="/bienes",
    tags=["Bienes (Activos Físicos)"]
)
# ==============================================================================
# SUBSISTEMA: CATÁLOGO (TIPOS DE BIEN)
# ==============================================================================
@router.post(
    "/tipos-bien", 
    response_model=schemas.TipoBienOut, 
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def crear_tipo_bien(
    request: Request,
    tipo: schemas.TipoBienCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:editar"))
):

    nuevo = models.TipoBien(
        nombre=tipo.nombre,
        tasa_depreciacion_anual=tipo.tasa_depreciacion_anual,
        esta_activo=True 
    )
    db.add(nuevo)
    
    try:
        await db.commit()
        await db.refresh(nuevo)
        return nuevo
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe un tipo de bien registrado con este nombre."
        )

@router.get(
    "/tipos-bien", 
    response_model=schemas.TipoBienPaginatedOut
)
@limiter.limit("30/minute")
async def listar_tipos_bien(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False, description="Si es True, devuelve todos los registros, incluyendo dados de baja"),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):

    query_count = select(func.count(models.TipoBien.id_tipo))
    query_data = select(models.TipoBien)

    if not incluir_inactivos:
        query_count = query_count.where(models.TipoBien.esta_activo == True)
        query_data = query_data.where(models.TipoBien.esta_activo == True)

    total = await db.scalar(query_count)
    
    query_data = query_data.offset(offset).limit(limit)
    result = await db.execute(query_data)
    tipos = result.scalars().all()
    
    return {
        "total": total, 
        "limit": limit, 
        "offset": offset, 
        "data": tipos
    }

@router.get(
    "/tipos-bien/{id_tipo}", 
    response_model=schemas.TipoBienOut
)
@limiter.limit("30/minute")
async def obtener_tipo_bien(
    request: Request,
    id_tipo: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):

    stmt = select(models.TipoBien).where(models.TipoBien.id_tipo == id_tipo)
    result = await db.execute(stmt)
    tipo = result.scalars().first()

    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Tipo de bien no encontrado."
        )
    return tipo

@router.patch(
    "/tipos-bien/{id_tipo}", 
    response_model=schemas.TipoBienOut
)
@limiter.limit("30/minute")
async def actualizar_tipo_bien(
    request: Request,
    id_tipo: UUID,
    tipo_in: schemas.TipoBienUpdate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:editar"))
):

    stmt = select(models.TipoBien).where(models.TipoBien.id_tipo == id_tipo)
    result = await db.execute(stmt)
    tipo = result.scalars().first()

    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Tipo de bien no encontrado."
        )
    if not tipo.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No puedes editar un tipo de bien inactivo."
        )

    update_data = tipo_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tipo, key, value)

    try:
        await db.commit()
        await db.refresh(tipo)
        return tipo
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe un tipo de bien registrado con este nombre."
        )

@router.delete(
    "/tipos-bien/{id_tipo}", 
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def borrar_tipo_bien(
    request: Request,
    id_tipo: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:borrar"))
):

    stmt = select(models.TipoBien).where(models.TipoBien.id_tipo == id_tipo)
    result = await db.execute(stmt)
    tipo = result.scalars().first()

    if not tipo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Tipo de bien no encontrado."
        )
    if not tipo.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El tipo de bien ya está dado de baja."
        )

    tipo.esta_activo = False
    await db.commit()
    return
# ==============================================================================
# SUBSISTEMA: BIENES (ACTIVOS FIJOS)
# ==============================================================================
@router.post(
    "", 
    response_model=schemas.BienOut, 
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def crear_bien(
    request: Request,
    bien: schemas.BienCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:crear"))
):

    result = await db.execute(select(models.TipoBien).where(models.TipoBien.id_tipo.in_(bien.tipos_ids)))
    tipos = result.scalars().all()

    if len(tipos) != len(bien.tipos_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Uno o más tipos de bien especificados no existen en el sistema."
        )
    
    if any(not tipo.esta_activo for tipo in tipos):
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST, 
             detail="No es posible asignar tipos de bien inactivos a un activo nuevo."
         )

    nuevo_bien = models.Bien(
        serie=bien.serie,
        modelo=bien.modelo,
        marca=bien.marca,
        descripcion=bien.descripcion,
        costo=bien.costo,
        fecha_adquisicion=bien.fecha_adquisicion,
        esta_activo=True
    )

    nuevo_bien.tipos = tipos
    db.add(nuevo_bien)
    
    try:
        await db.commit()
        await db.refresh(nuevo_bien)
        return nuevo_bien
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe un activo registrado con este número de serie."
        )


@router.get(
    "", 
    response_model=schemas.BienPaginatedOut
)
@limiter.limit("30/minute")
async def listar_bienes(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False, description="Incluir activos dados de baja en el resultado"),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):

    query_count = select(func.count(models.Bien.id_bien))
    query_data = select(models.Bien).options(selectinload(models.Bien.tipos))

    if not incluir_inactivos:
        query_count = query_count.where(models.Bien.esta_activo == True)
        query_data = query_data.where(models.Bien.esta_activo == True)

    total = await db.scalar(query_count)
    
    query_data = query_data.offset(offset).limit(limit)
    result = await db.execute(query_data)
    bienes = result.scalars().all()
    
    return {
        "total": total, 
        "limit": limit, 
        "offset": offset, 
        "data": bienes
    }

@router.get(
    "/{id_bien}", 
    response_model=schemas.BienOut
)
@limiter.limit("30/minute")
async def obtener_bien(
    request: Request,
    id_bien: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):

    stmt = select(models.Bien).options(selectinload(models.Bien.tipos)).where(models.Bien.id_bien == id_bien)
    result = await db.execute(stmt)
    bien = result.scalars().first()

    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Activo no encontrado."
        )
    return bien

@router.patch(
    "/{id_bien}", 
    response_model=schemas.BienOut
)
@limiter.limit("30/minute")
async def actualizar_bien(
    request: Request,
    id_bien: UUID,
    bien_in: schemas.BienUpdate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:editar"))
):

    stmt = select(models.Bien).options(selectinload(models.Bien.tipos)).where(models.Bien.id_bien == id_bien)
    result = await db.execute(stmt)
    bien = result.scalars().first()

    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Activo no encontrado."
        )
    if not bien.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No puedes editar un activo inactivo."
        )

    update_data = bien_in.model_dump(exclude_unset=True, exclude={"tipos_ids"})
    for key, value in update_data.items():
        setattr(bien, key, value)

    if bien_in.tipos_ids is not None:
        result_tipos = await db.execute(select(models.TipoBien).where(models.TipoBien.id_tipo.in_(bien_in.tipos_ids)))
        tipos_nuevos = result_tipos.scalars().all()

        if len(tipos_nuevos) != len(bien_in.tipos_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Uno o más tipos de bien especificados no existen."
            )
        
        bien.tipos = tipos_nuevos

    try:
        await db.commit()
        await db.refresh(bien)
        return bien
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe un activo registrado con este número de serie."
        )


@router.delete(
    "/{id_bien}", 
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def borrar_bien(
    request: Request,
    id_bien: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:borrar"))
):

    stmt = select(models.Bien).where(models.Bien.id_bien == id_bien)
    result = await db.execute(stmt)
    bien = result.scalars().first()

    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Activo no encontrado."
        )
    if not bien.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El activo ya está dado de baja."
        )

    bien.esta_activo = False
    await db.commit()
    return