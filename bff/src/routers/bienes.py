import os
import httpx
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status

from src.schemas import bienes as schemas_bienes
from src.dependencies.auth import RequireCapabilityBFF, TokenPayload

router = APIRouter()

MS_BIENES_URL = os.getenv("MS_BIENES_URL", "http://ms_bienes_api:8000")
# ==============================================================================
# SUBSISTEMA: BIENES (ACTIVOS FÍSICOS)
# ==============================================================================
@router.get("", response_model=schemas_bienes.BienPaginatedOutBFF, status_code=status.HTTP_200_OK)
async def listar_bienes_revisor(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    
    try:
        response = await client.get(f"{MS_BIENES_URL}/bienes", headers=headers, params=params)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error de enlace en cluster: {str(e)}")

@router.get("/{id_bien}", response_model=schemas_bienes.BienOutBFF, status_code=status.HTTP_200_OK)
async def obtener_bien_por_id(
    request: Request, 
    id_bien: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        response = await client.get(f"{MS_BIENES_URL}/bienes/{id_bien}", headers=headers)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.post("", response_model=schemas_bienes.BienOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_nuevo_bien(
    request: Request, 
    bien_in: schemas_bienes.BienCreateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        payload = bien_in.model_dump(mode="json")
        response = await client.post(f"{MS_BIENES_URL}/bienes", headers=headers, json=payload)
        if response.status_code != status.HTTP_201_CREATED:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.patch("/{id_bien}", response_model=schemas_bienes.BienOutBFF, status_code=status.HTTP_200_OK)
async def modificar_bien(
    request: Request, 
    id_bien: UUID, 
    bien_in: schemas_bienes.BienUpdateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        payload = bien_in.model_dump(mode="json", exclude_unset=True)
        response = await client.patch(f"{MS_BIENES_URL}/bienes/{id_bien}", headers=headers, json=payload)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.delete("/{id_bien}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_de_baja_bien(
    request: Request, 
    id_bien: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        response = await client.delete(f"{MS_BIENES_URL}/bienes/{id_bien}", headers=headers)
        if response.status_code != status.HTTP_204_NO_CONTENT:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
# ==============================================================================
# SUBSISTEMA: CATÁLOGO (TIPOS DE BIEN)
# ==============================================================================
@router.get("/tipos-bien", response_model=schemas_bienes.TipoBienPaginatedOutBFF, status_code=status.HTTP_200_OK)
async def listar_tipos_bien_revisor(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    
    try:
        response = await client.get(f"{MS_BIENES_URL}/bienes/tipos-bien", headers=headers, params=params)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.get("/tipos-bien/{id_tipo}", response_model=schemas_bienes.TipoBienOutBFF, status_code=status.HTTP_200_OK)
async def obtener_tipo_bien_por_id(
    request: Request, 
    id_tipo: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        response = await client.get(f"{MS_BIENES_URL}/bienes/tipos-bien/{id_tipo}", headers=headers)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.post("/tipos-bien", response_model=schemas_bienes.TipoBienOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_tipo_bien(
    request: Request, 
    tipo_in: schemas_bienes.TipoBienCreateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        payload = tipo_in.model_dump(mode="json")
        response = await client.post(f"{MS_BIENES_URL}/bienes/tipos-bien", headers=headers, json=payload)
        if response.status_code != status.HTTP_201_CREATED:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.patch("/tipos-bien/{id_tipo}", response_model=schemas_bienes.TipoBienOutBFF, status_code=status.HTTP_200_OK)
async def modificar_tipo_bien(
    request: Request, 
    id_tipo: UUID, 
    tipo_in: schemas_bienes.TipoBienUpdateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        payload = tipo_in.model_dump(mode="json", exclude_unset=True)
        response = await client.patch(f"{MS_BIENES_URL}/bienes/tipos-bien/{id_tipo}", headers=headers, json=payload)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.delete("/tipos-bien/{id_tipo}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_de_baja_tipo_bien(
    request: Request, 
    id_tipo: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        response = await client.delete(f"{MS_BIENES_URL}/bienes/tipos-bien/{id_tipo}", headers=headers)
        if response.status_code != status.HTTP_204_NO_CONTENT:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))