from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_capability
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    prefix="/departamentos",
    tags=["Departamentos"]
)

@router.post(
    "", 
    response_model=schemas.DepartamentoOut, 
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def crear_departamento(
    request: Request,
    depto: schemas.DepartamentoCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("departamentos:crear"))
):
    # Invariante de Auditoría
    db.info['usuario_email'] = token_payload.get('email', 'desconocido')

    nuevo = models.Departamento(
        nombre=depto.nombre, 
        id_jefe_departamento=depto.id_jefe_departamento,
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
            detail="Ya existe un departamento registrado con ese nombre."
        )


@router.get(
    "", 
    response_model=schemas.DepartamentoPaginatedOut
)
@limiter.limit("30/minute")
async def listar_departamentos(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False, description="Si es True, devuelve todos los registros, incluyendo dados de baja"),
    token_payload: dict = Depends(require_capability("departamentos:leer"))
):
    query_count = select(func.count(models.Departamento.id_departamento))
    query_data = select(models.Departamento)

    if not incluir_inactivos:
        query_count = query_count.where(models.Departamento.is_active == True)
        query_data = query_data.where(models.Departamento.is_active == True)

    total = await db.scalar(query_count)
    
    query_data = query_data.offset(offset).limit(limit)
    result = await db.execute(query_data)
    departamentos = result.scalars().all()
    
    return {
        "total": total, 
        "limit": limit, 
        "offset": offset, 
        "data": departamentos
    }


@router.get(
    "/{id_departamento}", 
    response_model=schemas.DepartamentoOut
)
@limiter.limit("30/minute")
async def obtener_departamento(
    request: Request,
    id_departamento: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("departamentos:leer"))
):
    stmt = select(models.Departamento).where(models.Departamento.id_departamento == id_departamento)
    result = await db.execute(stmt)
    depto = result.scalars().first()

    if not depto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento no encontrado.")
    return depto


@router.patch(
    "/{id_departamento}", 
    response_model=schemas.DepartamentoOut
)
@limiter.limit("30/minute")
async def actualizar_departamento(
    request: Request,
    id_departamento: UUID,
    depto_in: schemas.DepartamentoUpdate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("departamentos:editar"))
):
    stmt = select(models.Departamento).where(models.Departamento.id_departamento == id_departamento)
    result = await db.execute(stmt)
    depto = result.scalars().first()

    if not depto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento no encontrado.")
    if not depto.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes editar un departamento inactivo.")

    # Invariante de Auditoría
    db.info['usuario_email'] = token_payload.get('email', 'desconocido')

    update_data = depto_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(depto, key, value)

    try:
        await db.commit()
        await db.refresh(depto)
        return depto
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe un departamento registrado con ese nombre."
        )


@router.delete(
    "/{id_departamento}", 
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def borrar_departamento(
    request: Request,
    id_departamento: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("departamentos:borrar"))
):
    stmt = select(models.Departamento).where(models.Departamento.id_departamento == id_departamento)
    result = await db.execute(stmt)
    depto = result.scalars().first()

    if not depto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Departamento no encontrado.")
    if not depto.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El departamento ya está dado de baja.")

    # Invariante de Auditoría
    db.info['usuario_email'] = token_payload.get('email', 'desconocido')

    depto.is_active = False
    await db.commit()
    return