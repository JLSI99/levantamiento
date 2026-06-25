import os
import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from uuid import UUID
from typing import Optional

from src.dependencies.auth import RequireCapabilityBFF, TokenPayload
from src.schemas import ubicaciones as schemas

router = APIRouter(
    prefix="/api/v1/ubicaciones",
    tags=["BFF Control Central de Infraestructura y Ubicaciones"]
)

MS_UBICACIONES_URL = os.getenv("MS_UBICACIONES_URL", "http://ms_ubicaciones_api:8000")

def extraer_detalle_error(response: httpx.Response) -> str:
    """Evita caídas por JSONDecodeError si el microservicio devuelve HTML (e.g. Nginx 502)"""
    try:
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            return response.json().get("detail", response.text)
        return f"Error upstream no estructurado ({response.status_code}): {response.text[:200]}"
    except Exception:
        return f"Error de comunicación remota con código de estado: {response.status_code}"
# ==============================================================================
# SEARCH & DROPDOWNS: AGREGACIÓN DE CATÁLOGOS UNIFICADOS
# ==============================================================================
@router.get("/catalogos", response_model=schemas.CatalogosUbicacionesOutBFF, status_code=status.HTTP_200_OK)
async def obtener_todos_los_catalogos_form(
    request: Request,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:leer")) 
):
    client: httpx.AsyncClient = request.app.state.http_client
    # Acceso por atributo blindado contra fallas en compilación estática
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}

    try:
        tareas_reales = [
            client.get(f"{MS_UBICACIONES_URL}/ubicaciones/edificios?limit=1000&incluir_inactivos=false", headers=headers),
            client.get(f"{MS_UBICACIONES_URL}/departamentos?limit=1000&incluir_inactivos=false", headers=headers)
        ]
        
        respuestas = await asyncio.gather(*tareas_reales)
        
        if any(r.status_code != 200 for r in respuestas):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Error de consistencia interna al consolidar infraestructura desde el microservicio base."
            )
            
        edificios_raw = respuestas[0].json().get("data", [])
        deptos_raw = respuestas[1].json().get("data", [])
        
        lista_edificios = []
        lista_aulas = []
        
        for ed in edificios_raw:
            lista_edificios.append({
                "id_entidad": ed["id_edificio"],
                "nombre": ed["nombre"],
                "clave": ed.get("clave")
            })
            for au in ed.get("aulas", []):
                if au.get("is_active", True):
                    lista_aulas.append({
                        "id_entidad": au["id_aula"],
                        "nombre": f"{au['nombre']} ({ed['nombre']})",
                        "clave": None
                    })
                    
        lista_deptos = [
            {
                "id_entidad": d["id_departamento"], 
                "nombre": d["nombre"], 
                "clave": None
            }
            for d in deptos_raw
        ]
        
        return schemas.CatalogosUbicacionesOutBFF(
            edificios=lista_edificios,
            aulas=lista_aulas,
            departamentos=lista_deptos
        )
        
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, 
            detail=f"Capa de persistencia de infraestructura no disponible: {str(exc)}"
        )
# ==============================================================================
# CRUD SUB-DOMINIO: EDIFICIOS
# ==============================================================================
@router.post("/edificios", response_model=schemas.EdificioOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_edificio(
    request: Request,
    body: schemas.EdificioCreateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("ubicaciones:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.post(f"{MS_UBICACIONES_URL}/ubicaciones/edificios", json=body.model_dump(), headers=headers)
    if response.status_code != 201:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.get("/edificios", response_model=schemas.EdificioPaginatedOutBFF)
async def listar_edificios(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("ubicaciones:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    response = await client.get(f"{MS_UBICACIONES_URL}/ubicaciones/edificios", params=params, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.get("/edificios/{id_edificio}", response_model=schemas.EdificioOutBFF)
async def obtener_edificio(
    request: Request,
    id_edificio: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("ubicaciones:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.get(f"{MS_UBICACIONES_URL}/ubicaciones/edificios/{id_edificio}", headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.patch("/edificios/{id_edificio}", response_model=schemas.EdificioOutBFF)
async def actualizar_edificio(
    request: Request,
    id_edificio: UUID,
    body: schemas.EdificioUpdateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("ubicaciones:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.patch(
        f"{MS_UBICACIONES_URL}/ubicaciones/edificios/{id_edificio}", 
        json=body.model_dump(exclude_unset=True), 
        headers=headers
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.delete("/edificios/{id_edificio}", status_code=status.HTTP_204_NO_CONTENT)
async def borrar_edificio(
    request: Request,
    id_edificio: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("ubicaciones:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.delete(f"{MS_UBICACIONES_URL}/ubicaciones/edificios/{id_edificio}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return
# ==============================================================================
# CRUD SUB-DOMINIO: AULAS
# ==============================================================================
@router.post("/edificios/{id_edificio}/aulas", response_model=schemas.AulaOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_aula(
    request: Request,
    id_edificio: UUID,
    body: schemas.AulaCreateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("ubicaciones:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.post(
        f"{MS_UBICACIONES_URL}/ubicaciones/edificios/{id_edificio}/aulas", 
        json=body.model_dump(), 
        headers=headers
    )
    if response.status_code != 201:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.get("/aulas/{id_aula}", response_model=schemas.AulaOutBFF)
async def obtener_aula(
    request: Request,
    id_aula: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("ubicaciones:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.get(f"{MS_UBICACIONES_URL}/ubicaciones/aulas/{id_aula}", headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.patch("/aulas/{id_aula}", response_model=schemas.AulaOutBFF)
async def actualizar_aula(
    request: Request,
    id_aula: UUID,
    body: schemas.AulaUpdateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("ubicaciones:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.patch(
        f"{MS_UBICACIONES_URL}/ubicaciones/aulas/{id_aula}", 
        json=body.model_dump(), 
        headers=headers
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.delete("/aulas/{id_aula}", status_code=status.HTTP_204_NO_CONTENT)
async def borrar_aula(
    request: Request,
    id_aula: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("ubicaciones:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.delete(f"{MS_UBICACIONES_URL}/ubicaciones/aulas/{id_aula}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return
# ==============================================================================
# CRUD SUB-DOMINIO: DEPARTAMENTOS
# ==============================================================================
@router.post("/departamentos", response_model=schemas.DepartamentoOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_departamento(
    request: Request,
    body: schemas.DepartamentoCreateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("departamentos:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.post(f"{MS_UBICACIONES_URL}/departamentos", json=body.model_dump(), headers=headers)
    if response.status_code != 201:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.get("/departamentos", response_model=schemas.DepartamentoPaginatedOutBFF)
async def listar_departamentos(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("departamentos:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    response = await client.get(f"{MS_UBICACIONES_URL}/departamentos", params=params, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.get("/departamentos/{id_departamento}", response_model=schemas.DepartamentoOutBFF)
async def obtener_departamento(
    request: Request,
    id_departamento: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("departamentos:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.get(f"{MS_UBICACIONES_URL}/departamentos/{id_departamento}", headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.patch("/departamentos/{id_departamento}", response_model=schemas.DepartamentoOutBFF)
async def actualizar_departamento(
    request: Request,
    id_departamento: UUID,
    body: schemas.DepartamentoUpdateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("departamentos:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.patch(
        f"{MS_UBICACIONES_URL}/departamentos/{id_departamento}", 
        json=body.model_dump(exclude_unset=True), 
        headers=headers
    )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return response.json()

@router.delete("/departamentos/{id_departamento}", status_code=status.HTTP_204_NO_CONTENT)
async def borrar_departamento(
    request: Request,
    id_departamento: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("departamentos:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.delete(f"{MS_UBICACIONES_URL}/departamentos/{id_departamento}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=extraer_detalle_error(response))
    return