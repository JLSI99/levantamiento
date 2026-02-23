from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database import get_db
from src import models, schemas

router = APIRouter(
    prefix="/roles",
    tags=["Roles y Permisos"]
)

@router.get(
    "",
    response_model=list[schemas.RolOut]
)
async def list_roles(
    db: AsyncSession = Depends(get_db)
):
    stmt = select(models.Rol)
    result = await db.execute(stmt)
    roles = result.scalars().all()
    return roles

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
            detail="El rol no existe o no tiene permisos asignados."
        )

    return permisos

@router.get(
    "/permisos",
    response_model=list[schemas.PermisoOut]
)
async def list_all_permisos(
    db: AsyncSession = Depends(get_db)
):
    stmt = select(models.PermisoEndpoint)
    result = await db.execute(stmt)
    permisos = result.scalars().all()
    return permisos