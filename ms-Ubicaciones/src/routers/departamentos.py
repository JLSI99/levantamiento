from typing import List
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

    nuevo = models.Departamento(nombre=depto.nombre, id_jefe_departamento=depto.id_jefe_departamento)
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
    offset: int = Query(0, ge=0)
):
    query_count = select(func.count()).select_from(models.Departamento)
    total = await db.scalar(query_count)

    query_data = select(models.Departamento).offset(offset).limit(limit)
    result = await db.execute(query_data)
    
    return {"total": total, "limit": limit, "offset": offset, "data": result.scalars().all()}