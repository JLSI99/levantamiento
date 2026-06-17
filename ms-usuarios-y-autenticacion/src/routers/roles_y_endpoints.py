from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_capability, validate_jwt_token

router = APIRouter(
    prefix="/roles",
    tags=["Roles y Permisos"]
)

# ==============================================================================
# 1. BLOQUE DE RUTAS ESTÁTICAS (Raíces y Colecciones Globales)
# ==============================================================================

@router.get(
    "",
    response_model=list[schemas.RolOut]
)
async def list_roles(
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:leer"))
):
    result = await db.execute(select(models.Rol))
    return result.scalars().all()


@router.post(
    "",
    response_model=schemas.RolOut,
    status_code=status.HTTP_201_CREATED
)
async def create_rol(
    rol_data: schemas.RolCreate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:crear"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')
    
    try:
        async with db.begin():
            nuevo_rol = models.Rol(**rol_data.model_dump())
            db.add(nuevo_rol)
            await db.flush()
            await db.refresh(nuevo_rol)
        return nuevo_rol
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Conflicto de Integridad",
                "mensaje": "El rol especificado ya existe o colisiona con restricciones únicas del esquema.",
                "detalle": str(e.orig)
            }
        )


@router.get(
    "/permisos",
    response_model=list[schemas.PermisoOut]
)
async def list_all_permisos(
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:leer"))
):
    result = await db.execute(select(models.PermisoEndpoint))
    return result.scalars().all()


@router.post(
    "/permisos",
    response_model=schemas.PermisoOut,
    status_code=status.HTTP_201_CREATED
)
async def create_permiso(
    permiso_data: schemas.PermisoCreate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:crear"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')
    
    try:
        async with db.begin():
            permiso = models.PermisoEndpoint(**permiso_data.model_dump())
            db.add(permiso)
            await db.flush()
            await db.refresh(permiso)
        return permiso
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Conflicto de Integridad",
                "mensaje": "El permiso especificado ya existe o colisiona con restricciones únicas del esquema.",
                "detalle": str(e.orig)
            }
        )


# ==============================================================================
# 2. BLOQUE DE RUTAS DINÁMICAS DE PERMISOS (Evita colisiones con operaciones de Rol)
# ==============================================================================

@router.get(
    "/permisos/{id_permiso}",
    response_model=schemas.PermisoOut
)
async def get_permiso(
    id_permiso: int,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:leer"))
):
    permiso = await db.get(models.PermisoEndpoint, id_permiso)
    if not permiso:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso no encontrado")
    return permiso


@router.patch(
    "/permisos/{id_permiso}",
    response_model=schemas.PermisoOut
)
async def update_permiso(
    id_permiso: int,
    permiso_data: schemas.PermisoUpdate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:editar"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')
    
    try:
        async with db.begin():
            permiso = await db.get(models.PermisoEndpoint, id_permiso)
            if not permiso:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso no encontrado")

            update_data = permiso_data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(permiso, key, value)

            await db.flush()
            await db.refresh(permiso)
        return permiso
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Conflicto de Integridad",
                "mensaje": "La actualización viola restricciones únicas del esquema relacional.",
                "detalle": str(e.orig)
            }
        )


@router.delete(
    "/permisos/{id_permiso}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_permiso(
    id_permiso: int,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:borrar"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')
    
    async with db.begin():
        permiso = await db.get(models.PermisoEndpoint, id_permiso)
        if not permiso:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permiso no encontrado")

        await db.delete(permiso)
        await db.flush()
    return


# ==============================================================================
# 3. BLOQUE DE RUTAS DINÁMICAS DE ROLES (id_rol como identificador base)
# ==============================================================================

@router.get(
    "/{id_rol}",
    response_model=schemas.RolOut
)
async def get_rol(
    id_rol: int,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:leer"))
):
    rol = await db.get(models.Rol, id_rol)
    if not rol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
    return rol


@router.patch(
    "/{id_rol}",
    response_model=schemas.RolOut
)
async def update_rol(
    id_rol: int,
    rol_data: schemas.RolUpdate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:editar"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')
    
    try:
        async with db.begin():
            rol = await db.get(models.Rol, id_rol)
            if not rol:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")

            update_data = rol_data.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(rol, key, value)

            await db.flush()
            await db.refresh(rol)
        return rol
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": "Conflicto de Integridad",
                "mensaje": "La modificación del nombre de rol colisiona con restricciones preexistentes.",
                "detalle": str(e.orig)
            }
        )


@router.delete(
    "/{id_rol}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_rol(
    id_rol: int,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:borrar"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')
    
    async with db.begin():
        rol = await db.get(models.Rol, id_rol)
        if not rol:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")
            
        await db.delete(rol)
        await db.flush()
    return


# ==============================================================================
# 4. SUBSISTEMA RELACIONAL (Matriz de Asociación Relativa Muchos a Muchos)
# ==============================================================================

@router.get(
    "/{id_rol}/permisos",
    response_model=list[schemas.PermisoOut]
)
async def get_permisos_by_rol(
    id_rol: int,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:leer"))
):
    # Verificamos primero la existencia atómica del recurso raíz (Rol)
    rol_existe = await db.get(models.Rol, id_rol)
    if not rol_existe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")

    stmt = (
        select(models.PermisoEndpoint)
        .join(models.rol_permiso)
        .where(models.rol_permiso.c.id_rol == id_rol)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/{id_rol}/permisos/{id_permiso}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def assign_permiso_to_rol(
    id_rol: int,
    id_permiso: int,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:editar"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')

    async with db.begin():
        stmt_rol = select(models.Rol).options(selectinload(models.Rol.permisos)).where(models.Rol.id_rol == id_rol)
        result_rol = await db.execute(stmt_rol)
        rol = result_rol.scalars().first()

        permiso = await db.get(models.PermisoEndpoint, id_permiso)

        if not rol or not permiso:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol o permiso no encontrado")

        if permiso in rol.permisos:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El permiso ya está asignado a este rol")

        rol.permisos.append(permiso)
        await db.flush()
    return


@router.delete(
    "/{id_rol}/permisos/{id_permiso}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def revoke_permiso_from_rol(
    id_rol: int,
    id_permiso: int,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:borrar"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')

    async with db.begin():
        stmt_rol = select(models.Rol).options(selectinload(models.Rol.permisos)).where(models.Rol.id_rol == id_rol)
        result_rol = await db.execute(stmt_rol)
        rol = result_rol.scalars().first()

        permiso = await db.get(models.PermisoEndpoint, id_permiso)

        if not rol or not permiso:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol o permiso no encontrado")

        if permiso not in rol.permisos:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="El permiso no está asignado a este rol")

        rol.permisos.remove(permiso)
        await db.flush()
    return


@router.put(
    "/{id_rol}/permisos",
    response_model=list[schemas.PermisoOut]
)
async def bulk_update_permisos_for_rol(
    id_rol: int,
    permisos_in: schemas.RolPermisosUpdate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("roles:editar"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')

    async with db.begin():
        stmt_rol = select(models.Rol).options(selectinload(models.Rol.permisos)).where(models.Rol.id_rol == id_rol)
        result_rol = await db.execute(stmt_rol)
        rol = result_rol.scalars().first()

        if not rol:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rol no encontrado")

        stmt_permisos = select(models.PermisoEndpoint).where(
            models.PermisoEndpoint.id_permiso.in_(permisos_in.permisos_ids)
        )
        result_permisos = await db.execute(stmt_permisos)
        nuevos_permisos = result_permisos.scalars().all()

        # Validación atómica de cardinalidad de entrada vs encontrados en el motor físico
        if len(nuevos_permisos) != len(set(permisos_in.permisos_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Uno o más IDs de los permisos proporcionados no existen en la base de datos"
            )

        rol.permisos = nuevos_permisos

        await db.flush()
        await db.refresh(rol)
        
    return rol.permisos