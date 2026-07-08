import os
import re
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from uuid import UUID
import httpx
from typing import Optional, List, Any

from src.dependencies.auth import RequireCapabilityBFF, TokenPayload
from src.schemas import admin as schemas

router = APIRouter()

MS_PERSONAS_BASE_URL = os.getenv("MS_PERSONAS_URL", "http://ms_personas_api:8000").rstrip("/")
MS_AUTH_BASE_URL     = os.getenv("MS_AUTH_URL", "http://ms_usuarios_api:8000").rstrip("/")

MS_PERSONAS_ROUTE = f"{MS_PERSONAS_BASE_URL}/personas"
MS_USUARIOS_ROUTE = f"{MS_AUTH_BASE_URL}/users"
MS_ROLES_ROUTE    = f"{MS_AUTH_BASE_URL}/roles"

def _extraer_detalle_error(response: httpx.Response) -> Any:
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            payload = response.json()
            if isinstance(payload, dict):
                return payload.get("detail", payload)
            return payload
        except (ValueError, TypeError):
            pass
    
    texto_crudo = response.text.strip() if response.text else ""
    if not texto_crudo:
        return f"Error upstream sin cuerpo de respuesta. Código HTTP: {response.status_code}"
    
    if texto_crudo.startswith("<") or "<html>" in texto_crudo.lower():
        return f"Error de infraestructura upstream (HTTP {response.status_code}). Servidor denegó la petición o está inaccesible."
        
    return texto_crudo
# ==============================================================================
# ORQUESTACIÓN TRANSACCIONAL BIFÁSICA (Alta Compuesta - Patrón Saga Orquestado)
# ==============================================================================
@router.post(
    "/alta-personal", 
    response_model=schemas.AltaPersonalCompuestaOutBFF, 
    status_code=status.HTTP_201_CREATED
)
async def alta_personal_centralizada(
    request: Request,
    body: schemas.AltaPersonalCompuestaRequestBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    if body.persona.curp.upper() != body.usuario.curp.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inconsistencia de Identidad: El CURP de la persona no coincide con el del usuario."
        )

    try:
        response_persona = await client.post(
            MS_PERSONAS_ROUTE, 
            json=body.persona.model_dump(), 
            headers=headers
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Falla de comunicación con ms-personas en fase de alta: {str(exc)}"
        )

    if response_persona.status_code != 201:
        detalle_error = _extraer_detalle_error(response_persona)
        raise HTTPException(
            status_code=response_persona.status_code, 
            detail=detalle_error
        )
    
    persona_data = response_persona.json()
    id_persona_creada = persona_data.get("id_persona")

    ejecucion_usuario_correcta = False
    error_detalle = None
    status_error = status.HTTP_500_INTERNAL_SERVER_ERROR

    try:
        response_usuario = await client.post(
            MS_USUARIOS_ROUTE, 
            json=body.usuario.model_dump(), 
            headers=headers
        )
        
        if response_usuario.status_code == 201:
            ejecucion_usuario_correcta = True
            return {
                "persona": persona_data,
                "usuario": response_usuario.json()
            }
        else:
            error_detalle = _extraer_detalle_error(response_usuario)
            status_error = response_usuario.status_code

    except httpx.RequestError as exc:
        error_detalle = f"Falla de red con ms-auth durante la fase de acoplamiento: {str(exc)}"
        status_error = status.HTTP_503_SERVICE_UNAVAILABLE

    if not ejecucion_usuario_correcta:
        try:
            response_compensacion = await client.delete(
                f"{MS_PERSONAS_ROUTE}/{id_persona_creada}", 
                headers=headers
            )
            if response_compensacion.status_code not in (204, 200):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "error": "Inconsistencia Crítica del Ecosistema",
                        "mensaje": "Falló el registro de credenciales y la subsecuente compensación demográfica.",
                        "origen": error_detalle
                    }
                )
        except httpx.RequestError as comp_exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error catastrófico en red de compensación: {str(comp_exc)}. Origen: {error_detalle}"
            )

        raise HTTPException(status_code=status_error, detail=error_detalle)
# ==============================================================================
# OPERACIONES PASIVAS DE REDIRECCIÓN SÍNCRONA (PROXY-BFF)
# ==============================================================================
@router.post("/personas", response_model=schemas.PersonaOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_persona(
    request: Request,
    body: schemas.PersonaCreateBFF, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("personas:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.post(MS_PERSONAS_ROUTE, json=body.model_dump(), headers=headers)
    if response.status_code != 201:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return response.json()

@router.get("/personas", response_model=schemas.PersonaPaginatedOutBFF)
async def listar_personas(
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    curp: Optional[str] = Query(None),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("personas:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    if curp:
        params["curp"] = curp.upper().strip()
        
    response = await client.get(MS_PERSONAS_ROUTE, params=params, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return response.json()

@router.patch("/personas/{id_persona}", response_model=schemas.PersonaOutBFF)
async def actualizar_persona(
    request: Request,
    id_persona: UUID, 
    body: schemas.PersonaUpdateBFF, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("personas:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.patch(f"{MS_PERSONAS_ROUTE}/{id_persona}", json=body.model_dump(exclude_unset=True), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return response.json()

@router.delete("/personas/{id_persona}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_baja_persona(
    request: Request,
    id_persona: UUID, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("personas:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.delete(f"{MS_PERSONAS_ROUTE}/{id_persona}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return

@router.post("/usuarios", response_model=schemas.UserOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    request: Request,
    body: schemas.UserRegisterRequestBFF, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.post(MS_USUARIOS_ROUTE, json=body.model_dump(), headers=headers)
    if response.status_code != 201:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return response.json()

@router.get("/usuarios", response_model=schemas.UserPaginatedOutBFF)
async def listar_usuarios(
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    response = await client.get(MS_USUARIOS_ROUTE, params=params, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return response.json()

@router.patch("/usuarios/{id_usuario}", response_model=schemas.UserOutBFF)
async def actualizar_usuario(
    request: Request,
    id_usuario: UUID, 
    body: schemas.UserUpdateBFF, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.patch(f"{MS_USUARIOS_ROUTE}/{id_usuario}", json=body.model_dump(exclude_unset=True), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return response.json()

@router.put("/usuarios/{id_usuario}/roles", response_model=schemas.UserOutBFF)
async def actualizar_roles_usuario(
    request: Request,
    id_usuario: UUID, 
    body: schemas.UserRoleUpdateBFF, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.put(f"{MS_USUARIOS_ROUTE}/{id_usuario}/roles", json=body.model_dump(), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return response.json()

@router.delete("/usuarios/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_baja_usuario(
    request: Request,
    id_usuario: UUID, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.delete(f"{MS_USUARIOS_ROUTE}/{id_usuario}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return
# ==============================================================================
# CONTROL DE ROLES Y PERMISOS GLOBAL (PROXY DIRECTO)
# ==============================================================================
@router.get("/roles", response_model=List[schemas.RolOutBFF])
async def listar_roles(
    request: Request,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("roles:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.get(MS_ROLES_ROUTE, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return response.json()

@router.put("/roles/{id_rol}/permisos", response_model=List[schemas.PermisoOutBFF])
async def actualizar_permisos_del_rol(
    request: Request,
    id_rol: int, 
    body: schemas.RolPermisosUpdateBFF, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("roles:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.put(f"{MS_ROLES_ROUTE}/{id_rol}/permisos", json=body.model_dump(), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=_extraer_detalle_error(response))
    return response.json()