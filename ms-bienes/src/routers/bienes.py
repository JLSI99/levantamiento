from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_capability
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    prefix="/bienes",
    tags=["Bienes (Activos Físicos)"]
)

@router.post(
    "", 
    response_model=schemas.BienOut, 
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def crear_bien(
    request: Request,
    bien: schemas.BienCreate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:crear"))
):
    # Validar y consultar Tipos de Bien
    result_tipos = await db.execute(select(models.TipoBien).where(models.TipoBien.id_tipo.in_(bien.tipos_ids)))
    tipos = result_tipos.scalars().all()

    if len(tipos) != len(bien.tipos_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Uno o más tipos de bien especificados no existen en el sistema."
        )
    
    if any(not tipo.esta_activo for tipo in tipos):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No es posible asignar tipos de bien inactivos a un activo nuevo."
        )

    # Validar y consultar Tags / Etiquetas
    tags = []
    if bien.tags_ids:
        result_tags = await db.execute(select(models.TagBien).where(models.TagBien.id_tag.in_(bien.tags_ids)))
        tags = result_tags.scalars().all()

        if len(tags) != len(bien.tags_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Uno o más tags especificados no existen en el sistema."
            )
        
        if any(not tag.esta_activo for tag in tags):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="No es posible asignar etiquetas (tags) inactivas a un activo nuevo."
            )

    nuevo_bien = models.Bien(
        numero_inventario=bien.numero_inventario,
        serie=bien.serie,
        modelo=bien.modelo,
        marca=bien.marca,
        descripcion=bien.descripcion,
        costo=bien.costo,
        fecha_adquisicion=bien.fecha_adquisicion,
        esta_activo=True
    )

    nuevo_bien.tipos = tipos
    nuevo_bien.tags = tags
    db.add(nuevo_bien)
    
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe un activo registrado con este número de inventario o número de serie."
        )

    stmt = (
        select(models.Bien)
        .where(models.Bien.id_bien == nuevo_bien.id_bien)
        .options(
            selectinload(models.Bien.tipos),
            selectinload(models.Bien.tags),
            selectinload(models.Bien.imagenes)
        )
    )
    result_bien = await db.execute(stmt)
    nuevo_bien_cargado = result_bien.scalar_one()

    return nuevo_bien_cargado

@router.get(
    "", 
    response_model=schemas.BienPaginatedOut
)
@limiter.limit("30/minute")
async def listar_bienes(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False, description="Incluir activos dados de baja en el resultado"),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):
    query_count = select(func.count(models.Bien.id_bien))
    query_data = select(models.Bien).options(
        selectinload(models.Bien.tipos),
        selectinload(models.Bien.tags),
        selectinload(models.Bien.imagenes)
    )

    if not incluir_inactivos:
        query_count = query_count.where(models.Bien.esta_activo == True)
        query_data = query_data.where(models.Bien.esta_activo == True)

    total = await db.scalar(query_count)
    
    query_data = query_data.offset(offset).limit(limit)
    result = await db.execute(query_data)
    bienes = result.scalars().all()
    
    return {
        "total": total, 
        "limit": limit, 
        "offset": offset, 
        "data": bienes
    }

@router.get(
    "/por-inventario/{numero_inventario}", 
    response_model=schemas.BienOut
)
@limiter.limit("30/minute")
async def obtener_bien_por_numero_inventario(
    request: Request,
    numero_inventario: str,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):
    stmt = select(models.Bien).options(
        selectinload(models.Bien.tipos),
        selectinload(models.Bien.tags),
        selectinload(models.Bien.imagenes)
    ).where(models.Bien.numero_inventario == numero_inventario)
    
    result = await db.execute(stmt)
    bien = result.scalars().first()

    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Activo con número de inventario '{numero_inventario}' no encontrado."
        )
    return bien

@router.get(
    "/{id_bien}", 
    response_model=schemas.BienOut
)
@limiter.limit("30/minute")
async def obtener_bien(
    request: Request,
    id_bien: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:leer"))
):
    stmt = select(models.Bien).options(
        selectinload(models.Bien.tipos),
        selectinload(models.Bien.tags),
        selectinload(models.Bien.imagenes)
    ).where(models.Bien.id_bien == id_bien)
    
    result = await db.execute(stmt)
    bien = result.scalars().first()

    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Activo no encontrado."
        )
    return bien

@router.patch(
    "/{id_bien}", 
    response_model=schemas.BienOut
)
@limiter.limit("30/minute")
async def actualizar_bien(
    request: Request,
    id_bien: UUID,
    bien_in: schemas.BienUpdate,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:editar"))
):
    stmt = select(models.Bien).options(
        selectinload(models.Bien.tipos),
        selectinload(models.Bien.tags),
        selectinload(models.Bien.imagenes)
    ).where(models.Bien.id_bien == id_bien)
    
    result = await db.execute(stmt)
    bien = result.scalars().first()

    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Activo no encontrado."
        )
    if not bien.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="No puedes editar un activo inactivo."
        )

    update_data = bien_in.model_dump(exclude_unset=True, exclude={"tipos_ids", "tags_ids"})
    for key, value in update_data.items():
        setattr(bien, key, value)

    # Actualizar relación de Tipos
    if bien_in.tipos_ids is not None:
        result_tipos = await db.execute(select(models.TipoBien).where(models.TipoBien.id_tipo.in_(bien_in.tipos_ids)))
        tipos_nuevos = result_tipos.scalars().all()

        if len(tipos_nuevos) != len(bien_in.tipos_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Uno o más tipos de bien especificados no existen."
            )
        
        if any(not tipo.esta_activo for tipo in tipos_nuevos):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="No es posible asignar tipos de bien inactivos."
            )
        
        bien.tipos = tipos_nuevos

    # Actualizar relación de Tags
    if bien_in.tags_ids is not None:
        result_tags = await db.execute(select(models.TagBien).where(models.TagBien.id_tag.in_(bien_in.tags_ids)))
        tags_nuevos = result_tags.scalars().all()

        if len(tags_nuevos) != len(bien_in.tags_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Uno o más tags especificados no existen."
            )
        
        if any(not tag.esta_activo for tag in tags_nuevos):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="No es posible asignar etiquetas (tags) inactivas."
            )
        
        bien.tags = tags_nuevos

    try:
        await db.commit()
        await db.refresh(bien)
        return bien
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe un activo registrado con este número de inventario o número de serie."
        )

@router.delete(
    "/{id_bien}", 
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def borrar_bien(
    request: Request,
    id_bien: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:borrar"))
):
    stmt = select(models.Bien).where(models.Bien.id_bien == id_bien)
    result = await db.execute(stmt)
    bien = result.scalars().first()

    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Activo no encontrado."
        )
    if not bien.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El activo ya está dado de baja."
        )

    bien.esta_activo = False
    await db.commit()
    return