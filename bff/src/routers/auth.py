import os
from fastapi import APIRouter, Depends, HTTPException, Request, status
from src.schemas import auth as schemas_auth
from src.dependencies.auth import obtener_token_valido

router = APIRouter(prefix="/api/v1/auth", tags=["BFF Autenticación"])

MS_AUTH_URL = os.getenv("MS_AUTH_URL", "http://ms_usuarios_api:8000")

@router.post("/login", response_model=schemas_auth.TokenBFF)
async def login_bff(request: Request, login_data: schemas_auth.UserLoginBFF):

    client = request.app.state.http_client
    try:
        response = await client.post(
            f"{MS_AUTH_URL}/auth/login",
            json=login_data.model_dump()
        )
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.json().get("detail", "Error en autenticación interna.")
            )
        return response.json()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error de conectividad con el servicio de autenticación: {str(e)}"
        )

@router.post("/refresh", response_model=schemas_auth.TokenBFF)
async def refresh_bff(request: Request, refresh_data: schemas_auth.TokenRefreshBFF):

    client = request.app.state.http_client
    try:
        response = await client.post(
            f"{MS_AUTH_URL}/auth/refresh",
            json=refresh_data.model_dump()
        )
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(
                status_code=response.status_code,
                detail=response.json().get("detail", "Error al procesar refresco.")
            )
        return response.json()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error en comunicación interna para refresco: {str(e)}"
        )

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_bff(request: Request):

    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    
    headers = {}
    if auth_header:
        headers["Authorization"] = auth_header
        
    try:
        response = await client.post(f"{MS_AUTH_URL}/auth/logout", headers=headers)
        return response.json()
    except Exception:
        return {"detail": "Sesión cerrada de forma perimetral"}

@router.get("/me")
async def obtener_contexto_sesion(payload: dict = Depends(obtener_token_valido)):

    return {
        "usuario": {
            "id_usuario": payload.get("sub"),
            "username": payload.get("username"),
            "email": payload.get("email"),
        },
        "roles": payload.get("roles", []),
        "capabilities": payload.get("caps", [])
    }