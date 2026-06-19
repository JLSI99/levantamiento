from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func, update
from sqlalchemy.exc import IntegrityError

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_capability
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    prefix="/ubicaciones",
    tags=["Ubicaciones Físicas"]
)

# ------------------------------------------------------------------------------
# SUBSISTEMA: EDIFICIOS
# ------------------------------------------------------------------------------
@router.post(
    "/edificios", 
    response_model=schemas.EdificioOut, 
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def crear_edificio(
    request: Request,
    edificio: schemas.EdificioCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("ubicaciones:crear"))
):
    # Invariante de Auditoría
    db.info['usuario_email'] = token_payload.get('email', 'desconocido')

    nuevo = models.Edificio(
        nombre=edificio.nombre, 
        clave=edificio.clave,
        is_active=True
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
            detail="Ya existe un edificio con ese nombre o clave."
        )


@router.get(
    "/edificios", 
    response_model=schemas.EdificioPaginatedOut
)
@limiter.limit("30/minute")
async def listar_edificios(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False, description="Incluir registros dados de baja"),
    token_payload: dict = Depends(require_capability("ubicaciones:leer"))
):
    query_count = select(func.count(models.Edificio.id_edificio))
    query_data = select(models.Edificio).options(selectinload(models.Edificio.aulas))

    if not incluir_inactivos:
        query_count = query_count.where(models.Edificio.is_active == True)
        query_data = query_data.where(models.Edificio.is_active == True)

    total = await db.scalar(query_count)

    query_data = query_data.offset(offset).limit(limit)
    result = await db.execute(query_data)
    edificios = result.scalars().all()
    
    return {"total": total, "limit": limit, "offset": offset, "data": edificios}


@router.get(
    "/edificios/{id_edificio}", 
    response_model=schemas.EdificioOut
)
@limiter.limit("30/minute")
async def obtener_edificio(
    request: Request,
    id_edificio: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("ubicaciones:leer"))
):
    stmt = select(models.Edificio).options(selectinload(models.Edificio.aulas)).where(models.Edificio.id_edificio == id_edificio)
    result = await db.execute(stmt)
    edificio = result.scalars().first()

    if not edificio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edificio no encontrado.")
    return edificio


@router.patch(
    "/edificios/{id_edificio}", 
    response_model=schemas.EdificioOut
)
@limiter.limit("30/minute")
async def actualizar_edificio(
    request: Request,
    id_edificio: UUID,
    edificio_in: schemas.EdificioUpdate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("ubicaciones:editar"))
):
    stmt = select(models.Edificio).where(models.Edificio.id_edificio == id_edificio)
    result = await db.execute(stmt)
    edificio = result.scalars().first()

    if not edificio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edificio no encontrado.")
    if not edificio.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes editar un edificio inactivo.")

    # Invariante de Auditoría
    db.info['usuario_email'] = token_payload.get('email', 'desconocido')

    update_data = edificio_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(edificio, key, value)

    try:
        await db.commit()
        
        # Re-fetch con carga relacional explícita post-commit
        stmt_refresh = select(models.Edificio).options(selectinload(models.Edificio.aulas)).where(models.Edificio.id_edificio == id_edificio)
        res_refresh = await db.execute(stmt_refresh)
        return res_refresh.scalars().first()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe un edificio con ese nombre o clave."
        )


@router.delete(
    "/edificios/{id_edificio}", 
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def borrar_edificio(
    request: Request,
    id_edificio: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("ubicaciones:borrar"))
):
    stmt = select(models.Edificio).where(models.Edificio.id_edificio == id_edificio)
    result = await db.execute(stmt)
    edificio = result.scalars().first()

    if not edificio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edificio no encontrado.")
    if not edificio.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El edificio ya está dado de baja.")

    # Invariante de Auditoría
    db.info['usuario_email'] = token_payload.get('email', 'desconocido')

    edificio.is_active = False 
    
    # Cascading Soft Delete imperativo sobre sub-entidades vinculadas
    stmt_aulas = update(models.Aula).where(models.Aula.id_edificio == id_edificio).values(is_active=False)
    await db.execute(stmt_aulas)
    
    await db.commit()
    return

# ------------------------------------------------------------------------------
# SUBSISTEMA: AULAS
# ------------------------------------------------------------------------------
@router.post(
    "/edificios/{id_edificio}/aulas", 
    response_model=schemas.AulaOut, 
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def crear_aula(
    request: Request,
    id_edificio: UUID,
    aula: schemas.AulaCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("ubicaciones:crear"))
):
    edificio = await db.get(models.Edificio, id_edificio)
    if not edificio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edificio no encontrado")
    if not edificio.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes agregar aulas a un edificio inactivo.")

    # Invariante de Auditoría
    db.info['usuario_email'] = token_payload.get('email', 'desconocido')

    nueva_aula = models.Aula(
        nombre=aula.nombre, 
        id_edificio=id_edificio,
        is_active=True
    )
    db.add(nueva_aula)
    
    try:
        await db.commit()
        await db.refresh(nueva_aula)
        return nueva_aula
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Error de integridad relacional al crear el aula.")


@router.get(
    "/aulas/{id_aula}", 
    response_model=schemas.AulaOut
)
@limiter.limit("30/minute")
async def obtener_aula(
    request: Request,
    id_aula: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("ubicaciones:leer"))
):
    stmt = select(models.Aula).where(models.Aula.id_aula == id_aula)
    result = await db.execute(stmt)
    aula = result.scalars().first()

    if not aula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada.")
    return aula


@router.patch(
    "/aulas/{id_aula}", 
    response_model=schemas.AulaOut
)
@limiter.limit("30/minute")
async def actualizar_aula(
    request: Request,
    id_aula: UUID,
    aula_in: schemas.AulaUpdate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("ubicaciones:editar"))
):
    stmt = select(models.Aula).where(models.Aula.id_aula == id_aula)
    result = await db.execute(stmt)
    aula = result.scalars().first()

    if not aula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada.")
    if not aula.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes editar un aula inactiva.")

    # Invariante de Auditoría
    db.info['usuario_email'] = token_payload.get('email', 'desconocido')

    update_data = aula_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(aula, key, value)

    try:
        await db.commit()
        await db.refresh(aula)
        return aula
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Restricción de unicidad violada en la modificación.")


@router.delete(
    "/aulas/{id_aula}", 
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def borrar_aula(
    request: Request,
    id_aula: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("ubicaciones:borrar"))
):
    stmt = select(models.Aula).where(models.Aula.id_aula == id_aula)
    result = await db.execute(stmt)
    aula = result.scalars().first()

    if not aula:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aula no encontrada.")
    if not aula.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El aula ya está dada de baja.")

    # Invariante de Auditoría
    db.info['usuario_email'] = token_payload.get('email', 'desconocido')

    aula.is_active = False
    await db.commit()
    return