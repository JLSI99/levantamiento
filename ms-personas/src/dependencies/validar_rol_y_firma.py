from fastapi import Header, HTTPException, Request, status, Depends
import httpx
import os

AUTH_SERVICE_URL = os.getenv(
    "AUTH_SERVICE_URL",
    "http://ms-usuarios-y-autenticacion:8000/internal/authorize"
)

async def require_authz(
    request: Request,
    authorization: str = Header(..., alias="Authorization")
) -> bool:

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header mal formado"
        )

    headers = {
        "Authorization": authorization,
        "X-Request-Path": request.url.path,
        "X-Request-Method": request.method.upper(),
    }

    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.post(
                AUTH_SERVICE_URL,
                headers=headers
            )
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de autenticación no disponible"
            )

    if response.status_code == 200:
        return True

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=response.status_code,
            detail=response.json().get("detail", "Acceso denegado")
        )

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Error inesperado al validar autorización"
    )