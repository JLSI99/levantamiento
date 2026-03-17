from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_authz

router = APIRouter(
    prefix="/roles",
    tags=["Roles y Permisos"],
    dependencies=[Depends(require_authz)]
)

@router.get(
    "",
    response_model=list[schemas.RolOut]
)
async def list_roles(
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(models.Rol))
    return result.scalars().all()


@router.get(
    "/{id_rol}/permisos",
    response_model=list[schemas.PermisoOut]
)
async def get_permisos_by_rol(
    id_rol: int,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(models.PermisoEndpoint)
        .join(models.rol_permiso)
        .where(models.rol_permiso.c.id_rol == id_rol)
    )

    result = await db.execute(stmt)
    permisos = result.scalars().all()

    if not permisos:
        raise HTTPException(
            status_code=404,
            detail="El rol no existe o no tiene permisos asignados"
        )

    return permisos


@router.get(
    "/permisos",
    response_model=list[schemas.PermisoOut]
)
async def list_all_permisos(
    db: AsyncSession = Depends(get_db)
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
    db: AsyncSession = Depends(get_db)
):
    permiso = models.PermisoEndpoint(**permiso_data.model_dump())
    db.add(permiso)
    await db.commit()
    await db.refresh(permiso)
    return permiso


@router.post(
    "/{id_rol}/permisos/{id_permiso}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def assign_permiso_to_rol(
    id_rol: int,
    id_permiso: int,
    db: AsyncSession = Depends(get_db)
):
    rol = await db.get(models.Rol, id_rol)
    permiso = await db.get(models.PermisoEndpoint, id_permiso)

    if not rol or not permiso:
        raise HTTPException(
            status_code=404,
            detail="Rol o permiso no encontrado"
        )

    if permiso in rol.permisos:
        raise HTTPException(
            status_code=409,
            detail="El permiso ya está asignado a este rol"
        )

    rol.permisos.append(permiso)
    await db.commit()