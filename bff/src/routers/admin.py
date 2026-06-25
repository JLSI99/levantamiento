import os
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from uuid import UUID
import httpx
from typing import Optional, List

# Inyección idiomática del cliente HTTP y esquemas compartidos del ecosistema
from src.dependencies.network import get_bff_http_client
from src.dependencies.auth import RequireCapabilityBFF, TokenPayload
from src.schemas import admin as schemas

router = APIRouter()

MS_PERSONAS_BASE_URL = os.getenv("MS_PERSONAS_URL", "http://ms_personas_api:8000")
MS_AUTH_BASE_URL = os.getenv("MS_AUTH_URL", "http://ms_usuarios_api:8000")

# ==============================================================================
# ORQUESTACIÓN TRANSACCIONAL BIFÁSICA (Alta Compuesta - Patrón Saga Orquestado)
# ==============================================================================
@router.post(
    "/alta-personal", 
    response_model=schemas.AltaPersonalCompuestaOutBFF, 
    status_code=status.HTTP_201_CREATED
)
async def alta_personal_centralizada(
    body: schemas.AltaPersonalCompuestaRequestBFF,
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:crear"))
):
    # Corrección Criptográfica: Lectura directa del objeto de tipado TokenPayload
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    # Validación de simetría estructural antes de iniciar la persistencia remota
    if body.persona.curp.upper() != body.usuario.curp.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inconsistencia de Identidad: El CURP de la persona no coincide con el del usuario."
        )

    # Paso 1: Intentar persistir en ms-personas (Fase de ejecución)
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

    # Inicialización de flags para la fase de compensación distributiva
    ejecucion_usuario_correcta = False
    error_detalle = None
    status_error = status.HTTP_500_INTERNAL_SERVER_ERROR

    # Paso 2: Intentar persistir en ms-usuarios-y-autenticacion
    try:
        response_usuario = await client.post(
            f"{MS_AUTH_BASE_URL}/users", 
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
            # Captura de errores de lógica de negocio (ej. Username/Email duplicados)
            error_detalle = response_usuario.json().get("detail")
            status_error = response_usuario.status_code

    except httpx.RequestError as exc:
        error_detalle = f"Falla de red con ms-auth durante la fase de acoplamiento: {str(exc)}"
        status_error = status.HTTP_503_SERVICE_UNAVAILABLE

    # Paso 3: FASE DE COMPENSACIÓN (Garantía de Atomicidad Conceptual - Rollback de la Saga)
    if not ejecucion_usuario_correcta:
        try:
            response_compensacion = await client.delete(
                f"{MS_PERSONAS_BASE_URL}/personas/{id_persona_creada}", 
                headers=headers
            )
            if response_compensacion.status_code not in (204, 200):
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

        # Retornar el error original de ms-auth tras haber limpiado de forma íntegra ms-personas
        raise HTTPException(status_code=status_error, detail=error_detalle)


# ==============================================================================
# OPERACIONES PASIVAS DE REDIRECCIÓN SÍNCRONA (PROXY-BFF)
# ==============================================================================
@router.post("/personas", response_model=schemas.PersonaOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_persona(
    body: schemas.PersonaCreateBFF, 
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("personas:crear"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.post(f"{MS_PERSONAS_BASE_URL}/personas", json=body.model_dump(), headers=headers)
    if response.status_code != 201:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.get("/personas", response_model=schemas.PersonaPaginatedOutBFF)
async def listar_personas(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    curp: Optional[str] = Query(None),
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("personas:leer"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    if curp:
        params["curp"] = curp.upper().strip()
        
    response = await client.get(f"{MS_PERSONAS_BASE_URL}/personas", params=params, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.patch("/personas/{id_persona}", response_model=schemas.PersonaOutBFF)
async def actualizar_persona(
    id_persona: UUID, 
    body: schemas.PersonaUpdateBFF, 
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("personas:editar"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.patch(f"{MS_PERSONAS_BASE_URL}/personas/{id_persona}", json=body.model_dump(exclude_unset=True), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.delete("/personas/{id_persona}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_baja_persona(
    id_persona: UUID, 
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("personas:borrar"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.delete(f"{MS_PERSONAS_BASE_URL}/personas/{id_persona}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return

@router.post("/usuarios", response_model=schemas.UserOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    body: schemas.UserRegisterRequestBFF, 
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:crear"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.post(f"{MS_AUTH_BASE_URL}/users", json=body.model_dump(), headers=headers)
    if response.status_code != 201:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.get("/usuarios", response_model=schemas.UserPaginatedOutBFF)
async def listar_usuarios(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False),
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:leer"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    response = await client.get(f"{MS_AUTH_BASE_URL}/users", params=params, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.patch("/usuarios/{id_usuario}", response_model=schemas.UserOutBFF)
async def actualizar_usuario(
    id_usuario: UUID, 
    body: schemas.UserUpdateBFF, 
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:editar"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.patch(f"{MS_AUTH_BASE_URL}/users/{id_usuario}", json=body.model_dump(exclude_unset=True), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.put("/usuarios/{id_usuario}/roles", response_model=schemas.UserOutBFF)
async def actualizar_roles_usuario(
    id_usuario: UUID, 
    body: schemas.UserRoleUpdateBFF, 
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:editar"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.put(f"{MS_AUTH_BASE_URL}/users/{id_usuario}/roles", json=body.model_dump(), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.delete("/usuarios/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_baja_usuario(
    id_usuario: UUID, 
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("usuarios:borrar"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.delete(f"{MS_AUTH_BASE_URL}/users/{id_usuario}", headers=headers)
    if response.status_code != 204:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return

# ==============================================================================
# CONTROL DE ROLES Y PERMISOS GLOBAL (PROXY DIRECTO)
# ==============================================================================
@router.get("/roles", response_model=List[schemas.RolOutBFF])
async def listar_roles(
    client: httpx.AsyncClient = Depends(get_bff_http_client), 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("roles:leer"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.get(f"{MS_AUTH_BASE_URL}/roles", headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()

@router.put("/roles/{id_rol}/permisos", response_model=List[schemas.PermisoOutBFF])
async def actualizar_permisos_del_rol(
    id_rol: int, 
    body: schemas.RolPermisosUpdateBFF, 
    client: httpx.AsyncClient = Depends(get_bff_http_client),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("roles:editar"))
):
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    response = await client.put(f"{MS_AUTH_BASE_URL}/roles/{id_rol}/permisos", json=body.model_dump(), headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
    return response.json()