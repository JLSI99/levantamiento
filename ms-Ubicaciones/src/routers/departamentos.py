from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_authz, validate_jwt_token
from src.dependencies.rate_limiter import limiter

router = APIRouter(tags=["Departamentos"], dependencies=[Depends(require_authz)])

@router.post("/departamentos", response_model=schemas.DepartamentoOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def crear_departamento(
    request: Request,
    depto: schemas.DepartamentoCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    nuevo = models.Departamento(
        nombre=depto.nombre, 
        id_jefe_departamento=depto.id_jefe_departamento,
        is_active=True
    )
    db.add(nuevo)
    
    try:
        await db.commit()
        await db.refresh(nuevo)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Ya existe un departamento con ese nombre.")

    return nuevo

@router.get("/departamentos", response_model=schemas.DepartamentoPaginatedOut)
@limiter.limit("30/minute")
async def listar_departamentos(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False, description="Incluir registros dados de baja") # NUEVO
):
    query_count = select(func.count(models.Departamento.id_departamento))
    query_data = select(models.Departamento)

    if not incluir_inactivos:
        query_count = query_count.where(models.Departamento.is_active == True)
        query_data = query_data.where(models.Departamento.is_active == True)

    total = await db.scalar(query_count)
    
    query_data = query_data.offset(offset).limit(limit)
    result = await db.execute(query_data)
    
    return {"total": total, "limit": limit, "offset": offset, "data": result.scalars().all()}

@router.get("/departamentos/{id_departamento}", response_model=schemas.DepartamentoOut)
@limiter.limit("30/minute")
async def obtener_departamento(
    request: Request,
    id_departamento: UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(models.Departamento).where(models.Departamento.id_departamento == id_departamento)
    result = await db.execute(stmt)
    depto = result.scalars().first()

    if not depto:
        raise HTTPException(status_code=404, detail="Departamento no encontrado.")
    return depto

@router.patch("/departamentos/{id_departamento}", response_model=schemas.DepartamentoOut)
@limiter.limit("30/minute")
async def actualizar_departamento(
    request: Request,
    id_departamento: UUID,
    depto_in: schemas.DepartamentoUpdate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    stmt = select(models.Departamento).where(models.Departamento.id_departamento == id_departamento)
    result = await db.execute(stmt)
    depto = result.scalars().first()

    if not depto:
        raise HTTPException(status_code=404, detail="Departamento no encontrado.")
    if not depto.is_active:
        raise HTTPException(status_code=400, detail="No puedes editar un departamento inactivo.")

    update_data = depto_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(depto, key, value)

    try:
        await db.commit()
        await db.refresh(depto)
        return depto
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Ya existe un departamento con ese nombre.")

@router.delete("/departamentos/{id_departamento}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def borrar_departamento(
    request: Request,
    id_departamento: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    stmt = select(models.Departamento).where(models.Departamento.id_departamento == id_departamento)
    result = await db.execute(stmt)
    depto = result.scalars().first()

    if not depto:
        raise HTTPException(status_code=404, detail="Departamento no encontrado.")
    if not depto.is_active:
        raise HTTPException(status_code=400, detail="El departamento ya está dado de baja.")

    depto.is_active = False
    await db.commit()
    return