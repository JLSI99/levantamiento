from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from datetime import date
from uuid import UUID

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_authz, validate_jwt_token
from src.dependencies.rate_limiter import limiter

router = APIRouter(tags=["Resguardos"], dependencies=[Depends(require_authz)])

@router.post("/resguardos", response_model=schemas.AsignacionOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def crear_resguardo(
    request: Request,
    data: schemas.AsignacionCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    result = await db.execute(
        select(models.Asignacion)
        .where(
            models.Asignacion.id_bien == data.id_bien,
            models.Asignacion.fecha_fin.is_(None),
            models.Asignacion.esta_activo == True 
        )
    )

    if result.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="El bien ya tiene un resguardo vigente.",
        )

    resguardo = models.Asignacion(
        **data.model_dump(),
        fecha_inicio=date.today(),
        esta_activo=True
    )

    db.add(resguardo)
    await db.commit()
    await db.refresh(resguardo)

    return resguardo

@router.get("/resguardos", response_model=schemas.AsignacionPaginatedOut)
@limiter.limit("30/minute")
async def listar_resguardos(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    solo_vigentes: bool = Query(True, description="Si es True, solo trae los que no tienen fecha_fin"),
    incluir_borrados: bool = Query(False, description="Si es True, incluye los dados de baja (Soft Delete)")
):
    query_count = select(func.count(models.Asignacion.id_asignacion))
    query_data = select(models.Asignacion)

    if solo_vigentes:
        query_count = query_count.where(models.Asignacion.fecha_fin.is_(None))
        query_data = query_data.where(models.Asignacion.fecha_fin.is_(None))
        
    if not incluir_borrados:
        query_count = query_count.where(models.Asignacion.esta_activo == True)
        query_data = query_data.where(models.Asignacion.esta_activo == True)

    total = await db.scalar(query_count)

    query_data = query_data.offset(offset).limit(limit)
    result = await db.execute(query_data)
    
    return {"total": total, "limit": limit, "offset": offset, "data": result.scalars().all()}

@router.get("/resguardos/{id_asignacion}", response_model=schemas.AsignacionOut)
@limiter.limit("30/minute")
async def obtener_resguardo(
    request: Request,
    id_asignacion: UUID,
    db: AsyncSession = Depends(get_db)
):
    stmt = select(models.Asignacion).where(models.Asignacion.id_asignacion == id_asignacion)
    result = await db.execute(stmt)
    resguardo = result.scalars().first()

    if not resguardo:
        raise HTTPException(status_code=404, detail="Resguardo no encontrado.")
    return resguardo

@router.patch("/resguardos/{id_asignacion}", response_model=schemas.AsignacionOut)
@limiter.limit("30/minute")
async def actualizar_resguardo(
    request: Request,
    id_asignacion: UUID,
    data_in: schemas.AsignacionUpdate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    stmt = select(models.Asignacion).where(models.Asignacion.id_asignacion == id_asignacion)
    result = await db.execute(stmt)
    resguardo = result.scalars().first()

    if not resguardo:
        raise HTTPException(status_code=404, detail="Resguardo no encontrado.")
    if not resguardo.esta_activo:
        raise HTTPException(status_code=400, detail="No puedes editar un resguardo borrado lógicamente.")

    update_data = data_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(resguardo, key, value)

    await db.commit()
    await db.refresh(resguardo)
    return resguardo

@router.post("/resguardos/{id_asignacion}/cerrar", response_model=schemas.AsignacionOut, status_code=status.HTTP_200_OK)
@limiter.limit("30/minute")
async def cerrar_resguardo(
    request: Request,
    id_asignacion: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    result = await db.execute(
        select(models.Asignacion)
        .where(
            models.Asignacion.id_asignacion == id_asignacion,
            models.Asignacion.esta_activo == True
        )
    )

    resguardo = result.scalars().first()

    if not resguardo:
        raise HTTPException(status_code=404, detail="Resguardo no encontrado.")
    
    if resguardo.fecha_fin is not None:
         raise HTTPException(status_code=400, detail="Este resguardo ya fue cerrado previamente.")

    resguardo.fecha_fin = date.today()
    await db.commit()
    await db.refresh(resguardo)

    return resguardo

@router.delete("/resguardos/{id_asignacion}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def borrar_resguardo(
    request: Request,
    id_asignacion: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    stmt = select(models.Asignacion).where(models.Asignacion.id_asignacion == id_asignacion)
    result = await db.execute(stmt)
    resguardo = result.scalars().first()

    if not resguardo:
        raise HTTPException(status_code=404, detail="Resguardo no encontrado.")
    if not resguardo.esta_activo:
        raise HTTPException(status_code=400, detail="Este resguardo ya está dado de baja.")

    resguardo.esta_activo = False
    await db.commit()
    return