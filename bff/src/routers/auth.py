import os
import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
import httpx

from src.schemas import auth as schemas_auth
from src.dependencies.auth import obtener_token_valido, TokenPayload

logger = logging.getLogger("bff_router_auth")
router = APIRouter()

MS_AUTH_URL = os.getenv("MS_AUTH_URL", "http://ms_usuarios_api:8000")

def get_bff_http_client(request: Request) -> httpx.AsyncClient:
    client = getattr(request.app.state, "http_client", None)
    if not client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Pool de conexiones HTTPX no inicializado en el contexto de la aplicación."
        )
    return client

@router.post(
    "/login", 
    response_model=schemas_auth.TokenBFF,
    status_code=status.HTTP_200_OK,
    summary="Login Perimetral",
    description="Actúa como proxy inverso asíncrono transmitiendo las credenciales hacia ms-usuarios-y-autenticacion."
)
async def login_bff(
    login_data: schemas_auth.UserLoginBFF,
    client: httpx.AsyncClient = Depends(get_bff_http_client)
):
    try:
        response = await client.post(
            f"{MS_AUTH_URL}/auth/login",
            json=login_data.model_dump()
        )
        
        if "application/json" not in response.headers.get("content-type", ""):
            logger.critical(f"ms-usuarios-y-autenticacion devolvió una respuesta no-JSON. Status: {response.status_code}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="El servicio interno de autenticación respondió de forma anómala (Estructura Corrupta)."
            )

        if response.status_code != status.HTTP_200_OK:
            error_detail = response.json().get("detail", "Error en autenticación interna.")
            raise HTTPException(
                status_code=response.status_code,
                detail=error_detail
            )
            
        return response.json()

    except HTTPException as http_exc:
        raise http_exc
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="El servicio interno de autenticación excedió el tiempo límite de espera."
        )
    except Exception as e:
        logger.error(f"Falla crítica de interconectividad con ms-usuarios-y-autenticacion: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Falla de conectividad perimetral con el microservicio de identidades."
        )


@router.post(
    "/refresh", 
    response_model=schemas_auth.TokenBFF,
    status_code=status.HTTP_200_OK,
    summary="Renovación de Sesión Perimetral",
    description="Propaga el Refresh Token hacia el microservicio interno para generar un nuevo par de claves."
)
async def refresh_bff(
    refresh_data: schemas_auth.TokenRefreshBFF,
    client: httpx.AsyncClient = Depends(get_bff_http_client)
):
    try:
        response = await client.post(
            f"{MS_AUTH_URL}/auth/refresh",
            json=refresh_data.model_dump()
        )
        
        if "application/json" not in response.headers.get("content-type", ""):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Respuesta inconsistente (No-JSON) recibida desde el microservicio de autenticación."
            )

        if response.status_code != status.HTTP_200_OK:
            error_detail = response.json().get("detail", "Error al procesar refresco.")
            raise HTTPException(
                status_code=response.status_code,
                detail=error_detail
            )
            
        return response.json()

    except HTTPException as http_exc:
        raise http_exc
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="El servicio de refresco de tokens excedió el tiempo límite de respuesta."
        )
    except Exception as e:
        logger.error(f"Falla crítica en canal de refresco HTTPX: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="El servicio de autenticación no se encuentra disponible para refrescar tokens."
        )


@router.post(
    "/logout", 
    status_code=status.HTTP_200_OK,
    summary="Cierre de Sesión Seguro",
    description="Invalida perimetralmente la sesión reenviando las cabeceras de autenticación si existen."
)
async def logout_bff(
    request: Request,
    client: httpx.AsyncClient = Depends(get_bff_http_client)
):
    auth_header = request.headers.get("Authorization")
    
    headers = {}
    if auth_header:
        headers["Authorization"] = auth_header
        
    try:
        response = await client.post(f"{MS_AUTH_URL}/auth/logout", headers=headers)
        if response.status_code == status.HTTP_200_OK:
            return response.json()
        
        return {"detail": "Sesión cerrada con advertencias en servicios internos."}
    except Exception as e:
        logger.warning(f"Logout propagado con caída de red interna (Fallback activado): {str(e)}")
        return {"detail": "Sesión cerrada de forma perimetral"}


@router.get(
    "/me", 
    response_model=schemas_auth.UserSessionContextOut,
    status_code=status.HTTP_200_OK,
    summary="Contexto de Usuario Actual",
    description="Resuelve la identidad del cliente decodificando localmente el JWT sin tocar la base de datos de usuarios."
)
async def obtener_contexto_sesion(payload: TokenPayload = Depends(obtener_token_valido)):
    return {
        "usuario": {
            "id_usuario": payload.sub,
            "username": payload.username,
            "email": payload.email,
        },
        "roles": payload.roles, 
        "capabilities": payload.caps
    }