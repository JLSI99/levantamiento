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
from src.dependencies.validar_rol_y_firma import require_authz, validate_jwt_token
from src.dependencies.rate_limiter import limiter

router = APIRouter(tags=["Ubicaciones Físicas"], dependencies=[Depends(require_authz)])

@router.post("/edificios", response_model=schemas.EdificioOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def crear_edificio(
    request: Request,
    edificio: schemas.EdificioCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    nuevo = models.Edificio(nombre=edificio.nombre, clave=edificio.clave)
    db.add(nuevo)
    
    try:
        await db.commit()
        await db.refresh(nuevo)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Ya existe un edificio con ese nombre o clave.")

    return nuevo

@router.get("/edificios", response_model=schemas.EdificioPaginatedOut)
@limiter.limit("30/minute")
async def listar_edificios(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    query_count = select(func.count()).select_from(models.Edificio)
    total = await db.scalar(query_count)

    query_data = select(models.Edificio).options(selectinload(models.Edificio.aulas)).offset(offset).limit(limit)
    result = await db.execute(query_data)
    
    return {"total": total, "limit": limit, "offset": offset, "data": result.scalars().all()}

@router.post("/edificios/{id_edificio}/aulas", response_model=schemas.AulaOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def crear_aula(
    request: Request,
    id_edificio: UUID,
    aula: schemas.AulaCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    edificio = await db.get(models.Edificio, id_edificio)
    if not edificio:
        raise HTTPException(status_code=404, detail="Edificio no encontrado")

    nueva_aula = models.Aula(nombre=aula.nombre, id_edificio=id_edificio)
    db.add(nueva_aula)
    await db.commit()
    await db.refresh(nueva_aula)

    return nueva_aula