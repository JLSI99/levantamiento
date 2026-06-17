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

# Corrección de nombres de variables de entorno para consistencia en el runtime
MS_PERSONAS_BASE_URL = os.getenv("MS_PERSONAS_URL", "http://ms_personas_api:8000")
MS_AUTH_BASE_URL = os.getenv("MS_AUTH_URL", "http://ms_usuarios_api:8000")

# ==============================================================================
# ORQUESTACIÓN TRANSACCIONAL BIFÁSICA (Alta Compuesta)
# ==============================================================================
@router.post(
    "/alta-personal", 
    response_model=schemas.AltaPersonalCompuestaOutBFF, 
    status_code=status.HTTP_201_CREATED
)
async def alta_personal_centralizada(
    request: Request,
    body: schemas.AltaPersonalCompuestaRequestBFF,
    token_payload: dict = Depends(RequireCapabilityBFF("usuarios:crear"))
):

    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    # El CURP interno debe coincidir simétricamente en ambos bloques antes de procesar
    if body.persona.curp.upper() != body.usuario.curp.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inconsistencia de Identidad: El CURP de la persona no coincide con el del usuario."
        )

    # Paso 1: Intentar persistir en ms-personas
    try:
        response_persona = await client.post(
            f"{MS_PERSONAS_BASE_URL}/personas", 
            json=body.persona.model_dump(), 
            headers=headers
        )
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Falla de comunicación con ms-personas: {str(exc)}"
        )

    if response_persona.status_code != 201:
        raise HTTPException(
            status_code=response_persona.status_code, 
            detail=response_persona.json().get("detail")
        )
    
    persona_data = response_persona.json()
    id_persona_creada = persona_data.get("id_persona")

    # Paso 2: Intentar persistir en ms-usuarios-y-autenticacion
    try:
        response_usuario = await client.post(
            f"{MS_AUTH_BASE_URL}/users", 
            json=body.usuario.model_dump(), 
            headers=headers
        )
        
        if response_usuario.status_code == 201:
            # Flujo Feliz: Ambas entidades creadas de forma íntegra
            return {
                "persona": persona_data,
                "usuario": response_usuario.json()
            }
            
        # Captura de error de negocio en ms-auth (ej. Username o Email duplicados)
        error_detalle = response_usuario.json().get("detail")
        status_error = response_usuario.status_code

    except httpx.RequestError as exc:
        error_detalle = f"Falla de red con ms-auth durante la fase de acoplamiento: {str(exc)}"
        status_error = status.HTTP_503_SERVICE_UNAVAILABLE

    # Paso 3: FASE DE COMPENSACIÓN (Rollback Síncrono)
    # Si llegamos a este punto, la persona se creó pero el usuario falló. Se purga el huérfano.
    try:
        # Se envía una petición DELETE directa para remover físicamente el registro huérfano
        # Nota: Se usa la capacidad corregida personas:borrar
        response_compensacion = await client.delete(
            f"{MS_PERSONAS_BASE_URL}/personas/{id_persona_creada}", 
            headers=headers
        )
        if response_compensacion.status_code not in (204, 200):
            # Alerta crítica: El rollback falló en el microservicio destino. Estado inconsistente detectado.
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": "Inconsistencia Crítica del Ecosistema",
                    "mensaje": "Fallo el registro de credenciales y la posterior purga de datos demográficos.",
                    "origen": error_detalle
                }
            )
    except httpx.RequestError as comp_exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error catastrófico en red de compensación: {str(comp_exc)}. Origen: {error_detalle}"
        )

    # Retornar el error original de ms-auth tras haber limpiado la casa exitosamente
    raise HTTPException(status_code=status_error, detail=error_detalle)
# ==============================================================================
# OPERACIONES PASIVAS CORREGIDAS (RUTAS INTERNAS SÍNCRONAS)
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
    
    response = await client.post(f"{MS_PERSONAS_BASE_URL}/personas", json=body.model_dump(), headers=headers)
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
        
    response = await client.get(f"{MS_PERSONAS_BASE_URL}/personas", params=params, headers=headers)
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
    
    response = await client.patch(f"{MS_PERSONAS_BASE_URL}/personas/{id_persona}", json=body.model_dump(exclude_unset=True), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.delete("/personas/{id_persona}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_baja_persona(
    request: Request, 
    id_persona: UUID, 
    token_payload: dict = Depends(RequireCapabilityBFF("personas:borrar"))
):
    # Unificación de capacidad CapBAC de personas:eliminar -> personas:borrar
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.delete(f"{MS_PERSONAS_BASE_URL}/personas/{id_persona}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return

@router.post("/usuarios", response_model=schemas.UserOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    request: Request, 
    body: schemas.UserRegisterRequestBFF, 
    token_payload: dict = Depends(RequireCapabilityBFF("usuarios:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.post(f"{MS_AUTH_BASE_URL}/users", json=body.model_dump(), headers=headers)
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
    response = await client.get(f"{MS_AUTH_BASE_URL}/users", params=params, headers=headers)
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
    
    response = await client.patch(f"{MS_AUTH_BASE_URL}/users/{id_usuario}", json=body.model_dump(exclude_unset=True), headers=headers)
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
    
    response = await client.put(f"{MS_AUTH_BASE_URL}/users/{id_usuario}/roles", json=body.model_dump(), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.delete("/usuarios/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_baja_usuario(
    request: Request, 
    id_usuario: UUID, 
    token_payload: dict = Depends(RequireCapabilityBFF("usuarios:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    response = await client.delete(f"{MS_AUTH_BASE_URL}/users/{id_usuario}", headers=headers)
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
    
    response = await client.get(f"{MS_AUTH_BASE_URL}/roles", headers=headers)
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
    
    response = await client.put(f"{MS_AUTH_BASE_URL}/roles/{id_rol}/permisos", json=body.model_dump(), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()