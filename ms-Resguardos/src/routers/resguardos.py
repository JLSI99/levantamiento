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
        )
    )

    if result.scalars().first():
        raise HTTPException(
            status_code=409,
            detail="El bien ya tiene un resguardo activo",
        )

    resguardo = models.Asignacion(
        **data.model_dump(),
        fecha_inicio=date.today(),
    )

    db.add(resguardo)
    await db.commit()
    await db.refresh(resguardo)

    return resguardo


@router.get("/resguardos", response_model=schemas.AsignacionPaginatedOut)
@limiter.limit("30/minute")
async def listar_resguardos_activos(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    query_count = select(func.count()).select_from(models.Asignacion).where(models.Asignacion.fecha_fin.is_(None))
    total = await db.scalar(query_count)

    query_data = select(models.Asignacion).where(models.Asignacion.fecha_fin.is_(None)).offset(offset).limit(limit)
    result = await db.execute(query_data)
    
    return {"total": total, "limit": limit, "offset": offset, "data": result.scalars().all()}


@router.post("/resguardos/{id_asignacion}/cerrar", status_code=status.HTTP_200_OK)
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
            models.Asignacion.fecha_fin.is_(None),
        )
    )

    resguardo = result.scalars().first()

    if not resguardo:
        raise HTTPException(
            status_code=404,
            detail="Resguardo no encontrado o ya cerrado",
        )

    resguardo.fecha_fin = date.today()
    await db.commit()

    return {"status": "resguardo cerrado"}