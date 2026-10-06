import os
import uuid
import pathspec
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status, UploadFile, File
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

MEDIA_BASE_DIR = os.getenv("MEDIA_DIR", "/app/media")
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

def validar_magic_bytes(header: bytes) -> str:

    if header.startswith(b"\xFF\xD8\xFF"):
        return "image/jpeg"
    elif header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    elif header.startswith(b"RIFF") and len(header) >= 12 and header[8:12] == b"WEBP":
        return "image/webp"
    else:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Firma binaria de archivo no permitida. Solo se admiten formatos JPEG, PNG y WEBP legítimos."
        )
# ==============================================================================
# ENDPOINTS: BIENES (ACTIVOS FIJOS)
# ==============================================================================
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
    result = await db.execute(select(models.TipoBien).where(models.TipoBien.id_tipo.in_(bien.tipos_ids)))
    tipos = result.scalars().all()

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

    nuevo_bien = models.Bien(
        serie=bien.serie,
        modelo=bien.modelo,
        marca=bien.marca,
        descripcion=bien.descripcion,
        costo=bien.costo,
        fecha_adquisicion=bien.fecha_adquisicion,
        esta_activo=True
    )

    nuevo_bien.tipos = tipos
    db.add(nuevo_bien)
    
    try:
        await db.commit()
        await db.refresh(nuevo_bien)
        return nuevo_bien
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe un activo registrado con este número de serie."
        )

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

    update_data = bien_in.model_dump(exclude_unset=True, exclude={"tipos_ids"})
    for key, value in update_data.items():
        setattr(bien, key, value)

    if bien_in.tipos_ids is not None:
        result_tipos = await db.execute(select(models.TipoBien).where(models.TipoBien.id_tipo.in_(bien_in.tipos_ids)))
        tipos_nuevos = result_tipos.scalars().all()

        if len(tipos_nuevos) != len(bien_in.tipos_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Uno o más tipos de bien especificados no existen."
            )
        
        bien.tipos = tipos_nuevos

    try:
        await db.commit()
        await db.refresh(bien)
        return bien
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Ya existe un activo registrado con este número de serie."
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
# ==============================================================================
# ENDPOINTS: GESTIÓN DE IMÁGENES DE BIENES (MÁXIMO 3)
# ==============================================================================
@router.post(
    "/{id_bien}/imagenes",
    response_model=List[schemas.ImagenBienOut],
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("15/minute")
async def cargar_imagenes_bien(
    request: Request,
    id_bien: UUID,
    archivos: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:editar"))
):

    if not archivos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un archivo de imagen."
        )

    stmt = select(models.Bien).options(selectinload(models.Bien.imagenes)).where(models.Bien.id_bien == id_bien)
    result = await db.execute(stmt)
    bien = result.scalars().first()

    if not bien:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El bien especificado no existe."
        )
    if not bien.esta_activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pueden adjuntar imágenes a un activo dado de baja."
        )

    imagenes_actuales = len(bien.imagenes)
    if imagenes_actuales + len(archivos) > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Límite excedido. El bien tiene {imagenes_actuales} imágenes y se intentó subir {len(archivos)}. Máximo permitido: 3."
        )

    directorio_destino = os.path.join(MEDIA_BASE_DIR, "bienes", str(id_bien))
    os.makedirs(directorio_destino, exist_ok=True)

    nuevas_imagenes_modelos = []
    archivos_creados_en_disco = []

    try:
        siguiente_orden = imagenes_actuales + 1

        for archivo in archivos:
            contenido_inicial = await archivo.read(12)
            mime_detectado = validar_magic_bytes(contenido_inicial)

            await archivo.seek(0)
            contenido_completo = await archivo.read()
            tamano_bytes = len(contenido_completo)

            if tamano_bytes > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"El archivo {archivo.filename} excede el límite permitido de 5 MB."
                )

            ext = ".jpg" if mime_detectado == "image/jpeg" else ".png" if mime_detectado == "image/png" else ".webp"
            nombre_unico = f"{uuid.uuid4()}{ext}"
            path_absoluto = os.path.join(directorio_destino, nombre_unico)
            path_relativo = f"bienes/{id_bien}/{nombre_unico}"

            with open(path_absoluto, "wb") as f:
                f.write(contenido_completo)

            archivos_creados_en_disco.append(path_absoluto)

            nueva_img = models.ImagenBien(
                id_bien=id_bien,
                path_archivo=path_relativo,
                nombre_original=archivo.filename or "imagen.jpg",
                mime_type=mime_detectado,
                tamano_bytes=tamano_bytes,
                orden=siguiente_orden
            )
            siguiente_orden += 1
            nuevas_imagenes_modelos.append(nueva_img)
            db.add(nueva_img)

        await db.commit()

        for img in nuevas_imagenes_modelos:
            await db.refresh(img)

        return nuevas_imagenes_modelos

    except Exception as exc:
        await db.rollback()
        for path_físico in archivos_creados_en_disco:
            if os.path.exists(path_físico):
                try:
                    os.remove(path_físico)
                except OSError:
                    pass
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno durante la persistencia de imágenes: {str(exc)}"
        )


@router.delete(
    "/{id_bien}/imagenes/{id_imagen}",
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("15/minute")
async def eliminar_imagen_bien(
    request: Request,
    id_bien: UUID,
    id_imagen: UUID,
    db: AsyncSession = Depends(get_db),
    token_payload: dict = Depends(require_capability("bienes:borrar"))
):

    stmt = select(models.ImagenBien).where(
        models.ImagenBien.id_imagen == id_imagen,
        models.ImagenBien.id_bien == id_bien
    )
    result = await db.execute(stmt)
    imagen = result.scalars().first()

    if not imagen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La imagen especificada no existe para este bien."
        )

    path_absoluto = os.path.join(MEDIA_BASE_DIR, imagen.path_archivo)

    await db.delete(imagen)
    await db.commit()

    if os.path.exists(path_absoluto):
        try:
            os.remove(path_absoluto)
        except OSError:
            pass

    return