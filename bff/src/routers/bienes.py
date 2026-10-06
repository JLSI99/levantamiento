import os
import httpx
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, UploadFile, File, status

from src.schemas import bienes as schemas_bienes
from src.dependencies.auth import RequireCapabilityBFF, TokenPayload

router = APIRouter()

MS_BIENES_URL = os.getenv("MS_BIENES_URL", "http://ms_bienes_api:8000").rstrip("/")

MS_BIENES_ROUTE = f"{MS_BIENES_URL}/bienes"
MS_TIPOS_ROUTE  = f"{MS_BIENES_URL}/bienes/tipos-bien"

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
    
    params = {
        "limit": limit,
        "offset": offset,
        "incluir_inactivos": "true" if incluir_inactivos else "false"
    }
    
    try:
        response = await client.get(MS_TIPOS_ROUTE, headers=headers, params=params)
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
        response = await client.get(f"{MS_TIPOS_ROUTE}/{id_tipo}", headers=headers)
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
        response = await client.post(MS_TIPOS_ROUTE, headers=headers, json=payload)
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
        response = await client.patch(f"{MS_TIPOS_ROUTE}/{id_tipo}", headers=headers, json=payload)
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
        response = await client.delete(f"{MS_TIPOS_ROUTE}/{id_tipo}", headers=headers)
        if response.status_code != status.HTTP_204_NO_CONTENT:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.get("/", response_model=schemas_bienes.BienPaginatedOutBFF, status_code=status.HTTP_200_OK)
async def listar_bienes_revisor(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    
    params = {
        "limit": limit,
        "offset": offset,
        "incluir_inactivos": "true" if incluir_inactivos else "false"
    }
    
    try:
        response = await client.get(MS_BIENES_ROUTE, headers=headers, params=params)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error de enlace en cluster: {str(e)}")

@router.post("/", response_model=schemas_bienes.BienOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_nuevo_bien(
    request: Request, 
    bien_in: schemas_bienes.BienCreateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        payload = bien_in.model_dump(mode="json")
        response = await client.post(MS_BIENES_ROUTE, headers=headers, json=payload)
        if response.status_code != status.HTTP_201_CREATED:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.get("/{id_bien}", response_model=schemas_bienes.BienOutBFF, status_code=status.HTTP_200_OK)
async def obtener_bien_por_id(
    request: Request, 
    id_bien: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        response = await client.get(f"{MS_BIENES_ROUTE}/{id_bien}", headers=headers)
        if response.status_code != status.HTTP_200_OK:
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
        response = await client.patch(f"{MS_BIENES_ROUTE}/{id_bien}", headers=headers, json=payload)
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
        response = await client.delete(f"{MS_BIENES_ROUTE}/{id_bien}", headers=headers)
        if response.status_code != status.HTTP_204_NO_CONTENT:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

# --------------------------------------------------------------------------
# ENDPOINTS DE ORQUESTACIÓN PARA GESTIÓN FOTOGRÁFICA (MULTIMEDIA)
# --------------------------------------------------------------------------
@router.post(
    "/{id_bien}/imagenes", 
    response_model=schemas_bienes.ImagenBienOutBFF, 
    status_code=status.HTTP_201_CREATED,
    summary="Subir y asociar imagen a un bien patrimonial"
)
async def subir_imagen_bien(
    request: Request,
    id_bien: UUID,
    file: UploadFile = File(..., description="Archivo de imagen (JPEG, PNG, WEBP). Máximo 5MB."),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:editar"))
):

    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:

        files = {
            "file": (file.filename, file.file, file.content_type)
        }
        
        response = await client.post(
            f"{MS_BIENES_ROUTE}/{id_bien}/imagenes",
            headers=headers,
            files=files
        )
        
        if response.status_code != status.HTTP_201_CREATED:
            try:
                error_detail = response.json().get("detail")
            except Exception:
                error_detail = response.text
            raise HTTPException(status_code=response.status_code, detail=error_detail)
            
        return response.json()
        
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail=f"Falla de transporte de red al delegar la carga de la imagen: {str(e)}"
        )
    finally:
        await file.close()

@router.delete(
    "/{id_bien}/imagenes/{id_imagen}", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar lógicamente/físicamente una imagen de un bien"
)
async def eliminar_imagen_bien(
    request: Request,
    id_bien: UUID,
    id_imagen: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:borrar"))
):

    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        response = await client.delete(
            f"{MS_BIENES_ROUTE}/{id_bien}/imagenes/{id_imagen}",
            headers=headers
        )
        
        if response.status_code != status.HTTP_204_NO_CONTENT:
            try:
                error_detail = response.json().get("detail")
            except Exception:
                error_detail = response.text
            raise HTTPException(status_code=response.status_code, detail=error_detail)
            
        return
        
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail=f"Falla de transporte de red al solicitar eliminación de la imagen: {str(e)}"
        )