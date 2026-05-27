import os
import httpx
from fastapi import APIRouter, HTTPException, status, Request, Query
from typing import List, Optional
from src.schemas.bienes import BienCreateBFF

router = APIRouter(prefix="/bienes", tags=["Bienes Orchestrator"])

# URL del microservicio de bienes
MS_BIENES_URL = os.getenv("MS_BIENES_URL", "http://ms_bienes_api:8000")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_bien(request: Request, bien: BienCreateBFF):
    # 1. Extraer el token que viene de React para el Token Relay
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="No se proporcionó token de sesión")

    async with httpx.AsyncClient() as client:
        try:
            # 2. Reenviar la petición al microservicio con el token original
            # mode='json' es vital para convertir UUIDs y dates a strings
            response = await client.post(
                f"{MS_BIENES_URL}/bienes",
                json=bien.model_dump(mode='json'), 
                headers={"Authorization": auth_header},
                timeout=10.0
            )
            
            if response.is_error:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=response.json().get("detail", "Error al crear el bien")
                )
            
            return response.json()

        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Servicio de Bienes no disponible")

@router.get("/")
async def listar_bienes(
    request: Request, 
    limit: int = 10, 
    offset: int = 0
):
    auth_header = request.headers.get("Authorization")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{MS_BIENES_URL}/bienes",
                params={"limit": limit, "offset": offset},
                headers={"Authorization": auth_header},
                timeout=10.0
            )
            
            if response.is_error:
                raise HTTPException(status_code=response.status_code, detail="Error al obtener bienes")
                
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Servicio de Bienes no disponible")

@router.get("/tipos-bien")
async def listar_tipos(request: Request):
    """Obtiene el catálogo de tipos de bienes para los formularios de React"""
    auth_header = request.headers.get("Authorization")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{MS_BIENES_URL}/tipos-bien",
                headers={"Authorization": auth_header}
            )
            if response.is_error:
                raise HTTPException(status_code=response.status_code, detail="Error al obtener tipos de bien")
            return response.json()
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Servicio de Bienes no disponible")