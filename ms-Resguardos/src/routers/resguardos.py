from typing import List, Optional, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from datetime import date

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_capability
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    prefix="/resguardos",
    tags=["Resguardos (Asignaciones de Activos)"]
)
# ==============================================================================
# SUBSISTEMA: OPERACIONES DE RESGUARDOS (PERSISTENCIA HISTÓRICA)
# ==============================================================================
@router.post(
    "", 
    response_model=schemas.AsignacionOut, 
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def crear_resguardo(
    request: Request,
    data: schemas.AsignacionCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("resguardos:crear"))
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
            status_code=status.HTTP_409_CONFLICT,
            detail="El activo fijo ya cuenta con un resguardo vigente. Debe cerrarse antes de reasignar."
        )

    resguardo = models.Asignacion(
        **data.model_dump(),
        fecha_inicio=date.today(),
        esta_activo=True
    )

    db.add(resguardo)
    
    try:
        await db.commit()
        await db.refresh(resguardo)
        return resguardo
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflicto de integridad: El activo está bloqueado por otra transacción activa."
        )

@router.get(
    "", 
    response_model=schemas.AsignacionPaginatedOut
)
@limiter.limit("30/minute")
async def listar_resguardos(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    solo_vigentes: bool = Query(True, description="Si es True, excluye registros con fecha_fin asentada"),
    incluir_borrados: bool = Query(False, description="Si es True, incluye registros dados de baja lógicamente"),
    curp: Optional[str] = Query(None, description="Filtrar el histórico de resguardos de una persona por su CURP"),
    token_payload: dict = Depends(require_capability("resguardos:leer"))
):
    query_count = select(func.count(models.Asignacion.id_asignacion))
    query_data = select(models.Asignacion)

    if solo_vigentes:
        query_count = query_count.where(models.Asignacion.fecha_fin.is_(None))
        query_data = query_data.where(models.Asignacion.fecha_fin.is_(None))
        
    if not incluir_borrados:
        query_count = query_count.where(models.Asignacion.esta_activo == True)
        query_data = query_data.where(models.Asignacion.esta_activo == True)

    if curp:
        query_count = query_count.where(models.Asignacion.curp == curp.upper().strip())
        query_data = query_data.where(models.Asignacion.curp == curp.upper().strip())

    total = await db.scalar(query_count)

    query_data = query_data.order_by(models.Asignacion.fecha_inicio.desc()).offset(offset).limit(limit)
    result = await db.execute(query_data)
    resguardos = result.scalars().all()
    
    return {
        "total": total, 
        "limit": limit, 
        "offset": offset, 
        "data": resguardos
    }

@router.get(
    "/{id_asignacion}", 
    response_model=schemas.AsignacionOut
)
@limiter.limit("30/minute")
async def obtener_resguardo(
    request: Request,
    id_asignacion: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("resguardos:leer"))
):
    stmt = select(models.Asignacion).where(models.Asignacion.id_asignacion == id_asignacion)
    result = await db.execute(stmt)
    resguardo = result.scalars().first()

    if not resguardo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Resguardo no encontrado."
        )
    return resguardo

@router.patch(
    "/{id_asignacion}", 
    response_model=schemas.AsignacionOut
)
@limiter.limit("30/minute")
async def actualizar_resguardo(
    request: Request,
    id_asignacion: UUID,
    data_in: schemas.AsignacionUpdate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("resguardos:editar"))
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    stmt = select(models.Asignacion).where(models.Asignacion.id_asignacion == id_asignacion)
    result = await db.execute(stmt)
    resguardo = result.scalars().first()

    if not resguardo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Resguardo no encontrado."
        )
    if not resguardo.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Restricción de Integridad: No es posible editar un resguardo inactivo (Soft Deleted)."
        )

    update_data = data_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(resguardo, key, value)

    try:
        await db.commit()
        await db.refresh(resguardo)
        return resguardo
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflicto en los parámetros de unicidad parcial del activo fijo."
        )

@router.post(
    "/{id_asignacion}/cerrar", 
    response_model=schemas.AsignacionOut, 
    status_code=status.HTTP_200_OK
)
@limiter.limit("30/minute")
async def cerrar_resguardo(
    request: Request,
    id_asignacion: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("resguardos:editar"))
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Resguardo no encontrado o inactivo."
        )
    
    if resguardo.fecha_fin is not None:
         raise HTTPException(
             status_code=status.HTTP_400_BAD_REQUEST, 
             detail="El resguardo ya fue cerrado de manera ordinaria previamente."
         )

    resguardo.fecha_fin = date.today()
    
    try:
        await db.commit()
        await db.refresh(resguardo)
        return resguardo
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al persistir la fecha de cierre de la asignación."
        )

@router.delete(
    "/{id_asignacion}", 
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def borrar_resguardo(
    request: Request,
    id_asignacion: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("resguardos:borrar"))
):
    db.info['usuario_email'] = token_payload.get("email", "sistema")

    stmt = select(models.Asignacion).where(models.Asignacion.id_asignacion == id_asignacion)
    result = await db.execute(stmt)
    resguardo = result.scalars().first()

    if not resguardo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Resguardo no encontrado."
        )
    if not resguardo.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El resguardo ya fue dado de baja del sistema previamente."
        )

    if resguardo.fecha_fin is None:
        resguardo.fecha_fin = date.today()

    resguardo.esta_activo = False
    
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al procesar la baja lógica del resguardo."
        )
    return