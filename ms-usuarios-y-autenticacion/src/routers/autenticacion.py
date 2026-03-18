from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload


from src.database import get_db
from src import models, schemas
from src.schemas import CheckAccessRequest, CheckAccessResponse
from src.models import Rol, PermisoEndpoint
from src.dependencies.hash_y_contrasenas import verify_password
from src.dependencies.manejo_JWT import (create_access_token,create_refresh_token,decode_token)
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación"]
)

@router.post(
    "/login",
    response_model=schemas.Token,
    status_code=status.HTTP_200_OK
)
@limiter.limit("5/minutes")
async def login(
    request: Request,
    data: schemas.UserLogin,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(models.Usuario)
        .options(selectinload(models.Usuario.roles))
        .where(
            (models.Usuario.email == data.identifier) |
            (models.Usuario.username == data.identifier)
        )
    )

    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo"
        )

    roles = [rol.nombre_rol for rol in user.roles]

    access_token = create_access_token(
        id_usuario=user.id_usuario,
        username=user.username,
        email=user.email,
        roles=roles
    )

    refresh_token = create_refresh_token(id_usuario=user.id_usuario)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post(
    "/logout",
    status_code=status.HTTP_200_OK
)
async def logout(
    authorization: str = Header(None)
):

    if not authorization:
        return {"detail": "Sesión cerrada"}

    if not authorization.startswith("Bearer "):
        return {"detail": "Sesión cerrada"}

    token = authorization.split(" ")[1]
    payload = decode_token(token)

    if not payload:
        return {"detail": "Sesión cerrada"}

    return {"detail": "Sesión cerrada"}

@router.post("/verificar-acceso", response_model=CheckAccessResponse)
async def verificar_acceso(
    datos: CheckAccessRequest,
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(PermisoEndpoint)
        .join(PermisoEndpoint.roles)
        .where(
            Rol.nombre_rol.in_(datos.roles),
            PermisoEndpoint.path_endpoint == datos.path,
            PermisoEndpoint.metodo_http == datos.metodo
        )
    )
    
    result = await db.execute(stmt)
    permiso = result.scalars().first()
    
    return {"permitido": permiso is not None}
