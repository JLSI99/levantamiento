from typing import Optional
from uuid import UUID
from datetime import datetime, date
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
    prefix="/resguardos/solicitudes",
    tags=["Solicitudes de Resguardo"]
)

@router.post("", response_model=schemas.SolicitudResguardoOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def crear_solicitud_resguardo(
    request: Request,
    data: schemas.SolicitudResguardoCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("solicitudes_resguardo:crear"))
):
    curp_solicitante = token_payload.get("curp") or token_payload.get("username")
    if not curp_solicitante:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Falta la identidad (CURP/username) en el token de usuario."
        )

    solicitud = models.SolicitudResguardo(
        bien_solicitado=data.bien_solicitado.strip(),
        curp_solicitante=curp_solicitante.upper().strip(),
        id_aula=data.id_aula,
        id_edificio=data.id_edificio,
        id_departamento=data.id_departamento,
        justificacion=data.justificacion,
        estado=models.EstadoSolicitud.PENDIENTE
    )

    db.add(solicitud)
    await db.commit()
    await db.refresh(solicitud)
    return solicitud


@router.get("/mis-solicitudes", response_model=schemas.SolicitudResguardoPaginatedOut)
@limiter.limit("30/minute")
async def listar_mis_solicitudes(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    token_payload: dict = Depends(require_capability("solicitudes_resguardo:mis_solicitudes"))
):
    curp = token_payload.get("curp") or token_payload.get("username")
    
    query_count = select(func.count(models.SolicitudResguardo.id_solicitud)).where(
        models.SolicitudResguardo.curp_solicitante == curp
    )
    query_data = select(models.SolicitudResguardo).where(
        models.SolicitudResguardo.curp_solicitante == curp
    )

    total = await db.scalar(query_count)
    query_data = query_data.order_by(models.SolicitudResguardo.fecha_solicitud.desc()).offset(offset).limit(limit)
    result = await db.execute(query_data)
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": result.scalars().all()
    }


@router.get("", response_model=schemas.SolicitudResguardoPaginatedOut)
@limiter.limit("30/minute")
async def listar_solicitudes_institucionales(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    estado: Optional[models.EstadoSolicitud] = Query(None),
    token_payload: dict = Depends(require_capability("solicitudes_resguardo:leer"))
):
    query_count = select(func.count(models.SolicitudResguardo.id_solicitud))
    query_data = select(models.SolicitudResguardo)

    if estado:
        query_count = query_count.where(models.SolicitudResguardo.estado == estado)
        query_data = query_data.where(models.SolicitudResguardo.estado == estado)

    total = await db.scalar(query_count)
    query_data = query_data.order_by(models.SolicitudResguardo.fecha_solicitud.desc()).offset(offset).limit(limit)
    result = await db.execute(query_data)
    
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": result.scalars().all()
    }


@router.post("/{id_solicitud}/aprobar", response_model=schemas.AsignacionOut)
@limiter.limit("15/minute")
async def aprobar_solicitud_resguardo(
    request: Request,
    id_solicitud: UUID,
    data: schemas.SolicitudResguardoAprobar,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("solicitudes_resguardo:aprobar"))
):
    curp_resolutor = token_payload.get("curp") or token_payload.get("username")

    stmt = select(models.SolicitudResguardo).where(models.SolicitudResguardo.id_solicitud == id_solicitud)
    res = await db.execute(stmt)
    solicitud = res.scalars().first()

    if not solicitud:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")

    if solicitud.estado != models.EstadoSolicitud.PENDIENTE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede dictaminar una solicitud que ya se encuentra en estado {solicitud.estado}."
        )

    res_vigente = await db.execute(
        select(models.Asignacion).where(
            models.Asignacion.numero_inventario == data.numero_inventario,
            models.Asignacion.fecha_fin.is_(None),
            models.Asignacion.esta_activo == True
        )
    )
    if res_vigente.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El activo con inventario '{data.numero_inventario}' ya se encuentra resguardado actualmente."
        )

    solicitud.estado = models.EstadoSolicitud.APROBADA
    solicitud.fecha_resolucion = datetime.now()
    solicitud.curp_resolutor = curp_resolutor

    nueva_asignacion = models.Asignacion(
        numero_inventario=data.numero_inventario.strip(),
        curp=solicitud.curp_solicitante,
        id_aula=solicitud.id_aula,
        id_edificio=solicitud.id_edificio,
        id_departamento=solicitud.id_departamento,
        fecha_inicio=date.today(),
        esta_activo=True
    )
    db.add(nueva_asignacion)

    try:
        await db.commit()
        await db.refresh(nueva_asignacion)
        return nueva_asignacion
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Error de concurrencia: Conflicto de unicidad al generar la asignación física."
        )


@router.post("/{id_solicitud}/rechazar", response_model=schemas.SolicitudResguardoOut)
@limiter.limit("15/minute")
async def rechazar_solicitud_resguardo(
    request: Request,
    id_solicitud: UUID,
    data: schemas.SolicitudResguardoRechazar,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("solicitudes_resguardo:aprobar"))
):
    curp_resolutor = token_payload.get("curp") or token_payload.get("username")

    stmt = select(models.SolicitudResguardo).where(models.SolicitudResguardo.id_solicitud == id_solicitud)
    res = await db.execute(stmt)
    solicitud = res.scalars().first()

    if not solicitud:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Solicitud no encontrada.")

    if solicitud.estado != models.EstadoSolicitud.PENDIENTE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La solicitud ya se encuentra procesada en estado {solicitud.estado}."
        )

    solicitud.estado = models.EstadoSolicitud.RECHAZADA
    solicitud.fecha_resolucion = datetime.now()
    solicitud.curp_resolutor = curp_resolutor
    solicitud.comentario_resolucion = data.comentario_resolucion

    await db.commit()
    await db.refresh(solicitud)
    return solicitud