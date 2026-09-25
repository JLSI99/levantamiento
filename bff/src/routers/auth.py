import logging
import os
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
import httpx

from src.dependencies.auth import TokenPayload, obtener_token_valido
from src.schemas import auth as schemas_auth

logger = logging.getLogger("bff.routers.auth")
router = APIRouter()

MS_AUTH_URL = os.getenv(
    "MS_AUTH_URL", "http://ms_usuarios_api:8000"
).rstrip("/")
MS_AUTH_ROUTE = f"{MS_AUTH_URL}/auth"


def _extract_error_detail(
    response: httpx.Response, fallback_msg: str
) -> str:
    """Extrae defensivamente el detalle de error enviado por el microservicio interno."""
    try:
        data = response.json()
        if isinstance(data, dict):
            return data.get("detail", fallback_msg)
        return fallback_msg
    except Exception:
        return fallback_msg


@router.post(
    "/login",
    response_model=schemas_auth.TokenBFF,
    status_code=status.HTTP_200_OK,
    summary="Login Perimetral",
    description=(
        "Proxy inverso asíncrono que transmite credenciales hacia"
        " ms-usuarios-y-autenticacion."
    ),
)
async def login_bff(request: Request, login_data: schemas_auth.UserLoginBFF):
    client: httpx.AsyncClient = request.app.state.http_client
    try:
        response = await client.post(
            f"{MS_AUTH_ROUTE}/login", json=login_data.model_dump()
        )

        if "application/json" not in response.headers.get("content-type", ""):
            logger.critical(
                "ms-usuarios-y-autenticacion devolvió una respuesta no-JSON."
                f" Status: {response.status_code}"
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "El servicio interno de autenticación respondió de forma"
                    " anómala (Estructura Corrupta)."
                ),
            )

        if response.status_code != status.HTTP_200_OK:
            error_detail = _extract_error_detail(
                response, "Error en autenticación interna."
            )
            raise HTTPException(
                status_code=response.status_code, detail=error_detail
            )

        return response.json()

    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.error(
            "Timeout al contactar ms-usuarios-y-autenticacion en /login"
        )
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=(
                "El servicio interno de autenticación excedió el tiempo límite"
                " de espera."
            ),
        )
    except httpx.RequestError as req_err:
        logger.error(
            "Falla de red/transporte HTTPX hacia ms-usuarios-y-autenticacion:"
            f" {req_err}"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Falla de conectividad perimetral con el microservicio de"
                " identidades."
            ),
        )
    except Exception as e:
        logger.exception(f"Error no controlado en login_bff perimetral: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno en la pasarela perimetral (BFF).",
        )


@router.post(
    "/refresh",
    response_model=schemas_auth.TokenBFF,
    status_code=status.HTTP_200_OK,
    summary="Renovación de Sesión Perimetral",
    description=(
        "Propaga el Refresh Token hacia el microservicio interno para generar"
        " un nuevo par de claves."
    ),
)
async def refresh_bff(
    request: Request, refresh_data: schemas_auth.TokenRefreshBFF
):
    client: httpx.AsyncClient = request.app.state.http_client
    try:
        response = await client.post(
            f"{MS_AUTH_ROUTE}/refresh", json=refresh_data.model_dump()
        )

        if "application/json" not in response.headers.get("content-type", ""):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "Respuesta inconsistente (No-JSON) recibida desde el"
                    " microservicio de autenticación."
                ),
            )

        if response.status_code != status.HTTP_200_OK:
            error_detail = _extract_error_detail(
                response, "Error al procesar refresco."
            )
            raise HTTPException(
                status_code=response.status_code, detail=error_detail
            )

        return response.json()

    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.error(
            "Timeout al contactar ms-usuarios-y-autenticacion en /refresh"
        )
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=(
                "El servicio de refresco de tokens excedió el tiempo límite de"
                " respuesta."
            ),
        )
    except httpx.RequestError as req_err:
        logger.error(
            f"Falla de red/transporte HTTPX en canal de refresco: {req_err}"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "El servicio de autenticación no se encuentra disponible para"
                " refrescar tokens."
            ),
        )
    except Exception as e:
        logger.exception(f"Error no controlado en refresh_bff: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error interno al refrescar la sesión.",
        )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Cierre de Sesión Seguro",
    description=(
        "Invalida perimetralmente la sesión reenviando las cabeceras de"
        " autenticación si existen."
    ),
)
async def logout_bff(request: Request):
    client: httpx.AsyncClient = request.app.state.http_client
    auth_header = request.headers.get("Authorization")

    headers = {}
    if auth_header:
        headers["Authorization"] = auth_header

    try:
        response = await client.post(
            f"{MS_AUTH_ROUTE}/logout", headers=headers
        )
        if response.status_code == status.HTTP_200_OK:
            try:
                return response.json()
            except Exception:
                return {"detail": "Sesión cerrada exitosamente."}

        return {
            "detail": "Sesión cerrada con advertencias en servicios internos."
        }
    except Exception as e:
        logger.warning(
            "Logout propagado con caída de red interna (Fallback activado):"
            f" {str(e)}"
        )
        return {"detail": "Sesión cerrada de forma perimetral"}


@router.get(
    "/me",
    response_model=schemas_auth.UserSessionContextOut,
    status_code=status.HTTP_200_OK,
    summary="Contexto de Usuario Actual",
    description=(
        "Resuelve la identidad del cliente decodificando localmente el JWT sin"
        " tocar la base de datos de usuarios."
    ),
)
async def obtener_contexto_sesion(
    payload: TokenPayload = Depends(obtener_token_valido),
):
    return {
        "usuario": {
            "id_usuario": payload.sub,
            "username": payload.username,
            "email": payload.email,
        },
        "roles": payload.roles,
        "capabilities": payload.caps,
    }