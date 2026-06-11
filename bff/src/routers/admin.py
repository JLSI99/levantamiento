import os
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from uuid import UUID
import httpx
from typing import Optional, List
from src.dependencies.auth import RequireCapabilityBFF
from src.schemas import admin as schemas

router = APIRouter(
    prefix="/admin",
    tags=["Administración Centralizada"]
)

MS_PERSONAS_BASE_URL = os.getenv("MS_PERSONAS_URL", "http://ms_personas_api:8000")
MS_AUTH_BASE_URL = os.getenv("MS_AUTH_URL", "http://ms_auth_api:8000")
# ==============================================================================
# GESTIÓN DE IDENTIDADES (ms-personas)
# ==============================================================================
@router.post("/personas", response_model=schemas.PersonaOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_persona(
    request: Request, 
    body: schemas.PersonaCreateBFF, 
    token_payload: dict = Depends(RequireCapabilityBFF("personas:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.post(MS_PERSONAS_URL, json=body.model_dump(), headers=headers)
    if response.status_code != 201:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.get("/personas", response_model=schemas.PersonaPaginatedOutBFF)
async def listar_personas(
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    curp: Optional[str] = Query(None),
    token_payload: dict = Depends(RequireCapabilityBFF("personas:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    if curp:
        params["curp"] = curp
        
    response = await client.get(MS_PERSONAS_URL, params=params, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.patch("/personas/{id_persona}", response_model=schemas.PersonaOutBFF)
async def actualizar_persona(
    request: Request, 
    id_persona: UUID, 
    body: schemas.PersonaUpdateBFF, 
    token_payload: dict = Depends(RequireCapabilityBFF("personas:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.patch(f"{MS_PERSONAS_URL}/{id_persona}", json=body.model_dump(exclude_unset=True), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.delete("/personas/{id_persona}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_baja_persona(
    request: Request, 
    id_persona: UUID, 
    token_payload: dict = Depends(RequireCapabilityBFF("personas:eliminar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.delete(f"{MS_PERSONAS_URL}/{id_persona}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return
# ==============================================================================
# GESTIÓN DE CUENTAS DE ACCESO (ms-auth)
# ==============================================================================
@router.post("/usuarios", response_model=schemas.UserOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    request: Request, 
    body: schemas.UserRegisterRequestBFF, 
    token_payload: dict = Depends(RequireCapabilityBFF("usuarios:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.post(f"{MS_AUTH_URL}/users", json=body.model_dump(), headers=headers)
    if response.status_code != 201:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.get("/usuarios", response_model=schemas.UserPaginatedOutBFF)
async def listar_usuarios(
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    token_payload: dict = Depends(RequireCapabilityBFF("usuarios:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    response = await client.get(f"{MS_AUTH_URL}/users", params=params, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.patch("/usuarios/{id_usuario}", response_model=schemas.UserOutBFF)
async def actualizar_usuario(
    request: Request, 
    id_usuario: UUID, 
    body: schemas.UserUpdateBFF, 
    token_payload: dict = Depends(RequireCapabilityBFF("usuarios:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.patch(f"{MS_AUTH_URL}/users/{id_usuario}", json=body.model_dump(exclude_unset=True), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.put("/usuarios/{id_usuario}/roles", response_model=schemas.UserOutBFF)
async def actualizar_roles_usuario(
    request: Request, 
    id_usuario: UUID, 
    body: schemas.UserRoleUpdateBFF, 
    token_payload: dict = Depends(RequireCapabilityBFF("usuarios:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.put(f"{MS_AUTH_URL}/users/{id_usuario}/roles", json=body.model_dump(), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.delete("/usuarios/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_baja_usuario(
    request: Request, 
    id_usuario: UUID, 
    token_payload: dict = Depends(RequireCapabilityBFF("usuarios:eliminar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.delete(f"{MS_AUTH_URL}/users/{id_usuario}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return
# ==============================================================================
# CONTROL DE ROLES Y PERMISOS GLOBAL
# ==============================================================================
@router.get("/roles", response_model=List[schemas.RolOutBFF])
async def listar_roles(
    request: Request, 
    token_payload: dict = Depends(RequireCapabilityBFF("roles:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.get(f"{MS_AUTH_URL}/roles", headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.put("/roles/{id_rol}/permisos", response_model=List[schemas.PermisoOutBFF])
async def actualizar_permisos_del_rol(
    request: Request, 
    id_rol: int, 
    body: schemas.RolPermisosUpdateBFF, 
    token_payload: dict = Depends(RequireCapabilityBFF("roles:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.put(f"{MS_AUTH_URL}/roles/{id_rol}/permisos", json=body.model_dump(), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()