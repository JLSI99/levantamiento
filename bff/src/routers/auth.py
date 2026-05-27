import os
import httpx
from fastapi import APIRouter, HTTPException, Depends, status, Header
from typing import Optional

from src.schemas.auth import UserLogin, TokenResponse
from src.dependencies.http import get_http_client

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación BFF"]
)

MS_AUTH_URL = os.getenv("MS_AUTH_URL", "http://ms_usuarios_api:8000")

@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin, 
    client: httpx.AsyncClient = Depends(get_http_client)
):

    try:
        response = await client.post(
            f"{MS_AUTH_URL}/auth/login",
            json=data.model_dump(),
            timeout=5.0
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"El servicio de identidad y usuarios no está disponible en la red interna: {exc}"
        )

    if response.status_code != status.HTTP_200_OK:
        try:
            error_data = response.json()
            error_msg = error_data.get("detail", "Credenciales incorrectas o error de validación")
        except (ValueError, TypeError):
            error_msg = f"Respuesta inesperada del servicio core (HTTP {response.status_code})"
        
        raise HTTPException(
            status_code=response.status_code,
            detail=error_msg
        )
        
    return response.json()

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    authorization: Optional[str] = Header(None),
    client: httpx.AsyncClient = Depends(get_http_client)
):

    if not authorization:
        return

    try:
        await client.post(
            f"{MS_AUTH_URL}/auth/logout",
            headers={"Authorization": authorization},
            timeout=3.0
        )
    except httpx.RequestError: 
        pass