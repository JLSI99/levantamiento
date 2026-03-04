from typing import List

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.database import get_db
from src.models import Rol, PermisoEndpoint
from src.dependencies.manejo_JWT import decode_token

async def validate_jwt_token(
    authorization: str = Header(..., alias="Authorization")
) -> dict:

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header mal formado"
        )

    token = authorization.split(" ")[1]

    payload = decode_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado"
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no es de tipo access"
        )

    return payload

async def validate_role_permission(
    request: Request,
    payload: dict = Depends(validate_jwt_token),
    db: AsyncSession = Depends(get_db)
) -> bool:

    user_roles: List[str] = payload.get("roles", [])

    if not user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario sin roles asignados"
        )

    request.scope["route"].path

    method = request.method.upper()

    stmt = (
        select(PermisoEndpoint)
        .join(PermisoEndpoint.roles)
        .where(
            Rol.nombre_rol.in_(user_roles),
            PermisoEndpoint.path_endpoint == path,
            PermisoEndpoint.metodo_http == method
        )
    )

    result = await db.execute(stmt)
    permiso = result.scalars().first()

    if not permiso:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para este endpoint"
        )

    return True

async def require_authz(
    _: bool = Depends(validate_role_permission)
) -> bool:

    return True