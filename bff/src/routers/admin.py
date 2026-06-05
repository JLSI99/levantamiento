import os
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from uuid import UUID
import httpx
from typing import Optional, List

from src.dependencies.auth import get_current_user # Ajusta según tu dependencia de verificación en BFF
from src.schemas import admin as schemas

router = APIRouter(
    prefix="/admin",
    tags=["Administración Centralizada"]
)

MS_PERSONAS_URL = os.getenv("MS_PERSONAS_URL", "http://ms-personas:8000")
MS_AUTH_URL = os.getenv("MS_AUTH_URL", "http://ms-usuarios-y-autenticacion:8000")

def extraer_token_header(request: Request) -> dict:
    """Propaga el token JWT original que viene del cliente hacia los microservicios."""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Falta cabecera de autorización")
    return {"Authorization": auth_header}

# ==========================================
# GESTIÓN DE IDENTIDADES (ms-personas)
# ==========================================

@router.post("/personas", response_model=schemas.PersonaOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_persona(request: Request, body: schemas.PersonaCreateBFF, user: dict = Depends(get_current_user)):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
    response = await client.post(f"{MS_PERSONAS_URL}/personas", json=body.model_dump(), headers=headers)
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
    user: dict = Depends(get_current_user)
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    if curp:
        params["curp"] = curp
        
    response = await client.get(f"{MS_PERSONAS_URL}/personas", params=params, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.patch("/personas/{id_persona}", response_model=schemas.PersonaOutBFF)
async def actualizar_persona(request: Request, id_persona: UUID, body: schemas.PersonaUpdateBFF, user: dict = Depends(get_current_user)):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
    response = await client.patch(f"{MS_PERSONAS_URL}/personas/{id_persona}", json=body.model_dump(exclude_unset=True), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.delete("/personas/{id_persona}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_baja_persona(request: Request, id_persona: UUID, user: dict = Depends(get_current_user)):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
    response = await client.delete(f"{MS_PERSONAS_URL}/personas/{id_persona}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return

# ==========================================
# GESTIÓN DE CUENTAS DE ACCESO (ms-auth)
# ==========================================

@router.post("/usuarios", response_model=schemas.UserOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_usuario(request: Request, body: schemas.UserRegisterRequestBFF, user: dict = Depends(get_current_user)):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
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
    user: dict = Depends(get_current_user)
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    response = await client.get(f"{MS_AUTH_URL}/users", params=params, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.patch("/usuarios/{id_usuario}", response_model=schemas.UserOutBFF)
async def actualizar_usuario(request: Request, id_usuario: UUID, body: schemas.UserUpdateBFF, user: dict = Depends(get_current_user)):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
    response = await client.patch(f"{MS_AUTH_URL}/users/{id_usuario}", json=body.model_dump(exclude_unset=True), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.put("/usuarios/{id_usuario}/roles", response_model=schemas.UserOutBFF)
async def actualizar_roles_usuario(request: Request, id_usuario: UUID, body: schemas.UserRoleUpdateBFF, user: dict = Depends(get_current_user)):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
    response = await client.put(f"{MS_AUTH_URL}/users/{id_usuario}/roles", json=body.model_dump(), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.delete("/usuarios/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_baja_usuario(request: Request, id_usuario: UUID, user: dict = Depends(get_current_user)):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
    response = await client.delete(f"{MS_AUTH_URL}/users/{id_usuario}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return

# ==========================================
# CONTROL DE ROLES Y PERMISOS GLOBAL
# ==========================================

@router.get("/roles", response_model=List[schemas.RolOutBFF])
async def listar_roles(request: Request, user: dict = Depends(get_current_user)):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
    response = await client.get(f"{MS_AUTH_URL}/roles", headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.put("/roles/{id_rol}/permisos", response_model=List[schemas.PermisoOutBFF])
async def actualizar_permisos_del_rol(request: Request, id_rol: int, body: schemas.RolPermisosUpdateBFF, user: dict = Depends(get_current_user)):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = extraer_token_header(request)
    
    response = await client.put(f"{MS_AUTH_URL}/roles/{id_rol}/permisos", json=body.model_dump(), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()