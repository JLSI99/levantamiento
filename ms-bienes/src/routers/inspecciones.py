from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_capability
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    prefix="/bienes/inspecciones",
    tags=["Checklist e Inspecciones Físicas"]
)

@router.post("", response_model=schemas.InspeccionBienOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
async def registrar_inspeccion_bien(
    request: Request,
    data: schemas.InspeccionBienCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):
    curp_auditor = token_payload.get("curp") or token_payload.get("username")
    if not curp_auditor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Falta la identidad del auditor (CURP/username) en el token."
        )

    stmt_bien = (
        select(models.Bien)
        .options(selectinload(models.Bien.imagenes))
        .where(models.Bien.numero_inventario == data.numero_inventario)
    )
    res_bien = await db.execute(stmt_bien)
    bien = res_bien.scalars().first()

    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe ningún bien registrado con el número de inventario '{data.numero_inventario}'."
        )

    if data.esta_presente:
        if data.estado_fisico == models.EstadoFisicoEnum.NO_APLICA:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Debe seleccionar un estado físico válido (BUENO, NORMAL o MALO) cuando el bien está presente."
            )
        estado_final = data.estado_fisico
    else:
        estado_final = models.EstadoFisicoEnum.NO_APLICA

    nueva_inspeccion = models.InspeccionBien(
        id_bien=bien.id_bien,
        esta_presente=data.esta_presente,
        estado_fisico=estado_final,
        observaciones=data.observaciones,
        curp_auditor=curp_auditor.upper().strip()
    )

    db.add(nueva_inspeccion)
    await db.commit()
    await db.refresh(nueva_inspeccion)

    stmt_out = (
        select(models.InspeccionBien)
        .options(selectinload(models.InspeccionBien.bien).selectinload(models.Bien.imagenes))
        .where(models.InspeccionBien.id_inspeccion == nueva_inspeccion.id_inspeccion)
    )
    res_out = await db.execute(stmt_out)
    return res_out.scalars().first()


@router.get("", response_model=schemas.InspeccionBienPaginatedOut)
@limiter.limit("40/minute")
async def listar_inspecciones_bienes(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    numero_inventario: Optional[str] = Query(None),
    esta_presente: Optional[bool] = Query(None),
    estado_fisico: Optional[models.EstadoFisicoEnum] = Query(None),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):
    query_count = select(func.count(models.InspeccionBien.id_inspeccion)).join(models.Bien)
    query_data = (
        select(models.InspeccionBien)
        .join(models.Bien)
        .options(selectinload(models.InspeccionBien.bien).selectinload(models.Bien.imagenes))
    )

    if numero_inventario and numero_inventario.strip():
        filtro_inv = f"%{numero_inventario.strip()}%"
        query_count = query_count.where(models.Bien.numero_inventario.ilike(filtro_inv))
        query_data = query_data.where(models.Bien.numero_inventario.ilike(filtro_inv))

    if esta_presente is not None:
        query_count = query_count.where(models.InspeccionBien.esta_presente == esta_presente)
        query_data = query_data.where(models.InspeccionBien.esta_presente == esta_presente)

    if estado_fisico is not None:
        query_count = query_count.where(models.InspeccionBien.estado_fisico == estado_fisico)
        query_data = query_data.where(models.InspeccionBien.estado_fisico == estado_fisico)

    total = await db.scalar(query_count)
    query_data = query_data.order_by(models.InspeccionBien.fecha_inspeccion.desc()).offset(offset).limit(limit)
    result = await db.execute(query_data)

    return {
        "total": total or 0,
        "limit": limit,
        "offset": offset,
        "data": result.scalars().all()
    }


@router.delete("/{id_inspeccion}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("15/minute")
async def eliminar_inspeccion_bien(
    request: Request,
    id_inspeccion: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:borrar"))
):
    stmt = select(models.InspeccionBien).where(models.InspeccionBien.id_inspeccion == id_inspeccion)
    res = await db.execute(stmt)
    inspeccion = res.scalars().first()

    if not inspeccion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El registro de inspección especificado no existe."
        )

    await db.delete(inspeccion)
    await db.commit()
    return