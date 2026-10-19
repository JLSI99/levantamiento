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
    prefix="/bienes/tags-bien",
    tags=["Etiquetas de Bien (Tags)"]
)

@router.post(
    "",
    response_model=schemas.TagBienOut,
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def crear_tag_bien(
    request: Request,
    tag: schemas.TagBienCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:crear"))
):
    nuevo_tag = models.TagBien(
        nombre=tag.nombre,
        esta_activo=True
    )
    db.add(nuevo_tag)
    try:
        await db.commit()
        await db.refresh(nuevo_tag)
        return nuevo_tag
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe una etiqueta (tag) registrada con el nombre '{tag.nombre}'."
        )

@router.get(
    "",
    response_model=schemas.TagBienPaginatedOut
)
@limiter.limit("30/minute")
async def listar_tags_bien(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False, description="Incluir etiquetas inactivas en la consulta"),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):
    query_count = select(func.count(models.TagBien.id_tag))
    query_data = select(models.TagBien)

    if not incluir_inactivos:
        query_count = query_count.where(models.TagBien.esta_activo == True)
        query_data = query_data.where(models.TagBien.esta_activo == True)

    total = await db.scalar(query_count)

    query_data = query_data.order_by(models.TagBien.nombre).offset(offset).limit(limit)
    result = await db.execute(query_data)
    tags = result.scalars().all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": tags
    }

@router.get(
    "/{id_tag}",
    response_model=schemas.TagBienOut
)
@limiter.limit("30/minute")
async def obtener_tag_bien(
    request: Request,
    id_tag: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):
    stmt = select(models.TagBien).where(models.TagBien.id_tag == id_tag)
    result = await db.execute(stmt)
    tag = result.scalars().first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Etiqueta (tag) no encontrada."
        )
    return tag

@router.patch(
    "/{id_tag}",
    response_model=schemas.TagBienOut
)
@limiter.limit("30/minute")
async def actualizar_tag_bien(
    request: Request,
    id_tag: UUID,
    tag_in: schemas.TagBienUpdate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:editar"))
):
    stmt = select(models.TagBien).where(models.TagBien.id_tag == id_tag)
    result = await db.execute(stmt)
    tag = result.scalars().first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Etiqueta (tag) no encontrada."
        )
    if not tag.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede modificar una etiqueta inactiva."
        )

    update_data = tag_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tag, key, value)

    try:
        await db.commit()
        await db.refresh(tag)
        return tag
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe otra etiqueta registrada con el nombre '{tag_in.nombre}'."
        )

@router.delete(
    "/{id_tag}",
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def dar_de_baja_tag_bien(
    request: Request,
    id_tag: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:borrar"))
):
    stmt = select(models.TagBien).where(models.TagBien.id_tag == id_tag)
    result = await db.execute(stmt)
    tag = result.scalars().first()

    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Etiqueta (tag) no encontrada."
        )
    if not tag.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La etiqueta ya se encuentra inactiva."
        )

    tag.esta_activo = False
    await db.commit()
    return