# bff/src/routers/resguardos.py
import os
import asyncio
import httpx
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from typing import List, Optional
from uuid import UUID

from src.dependencies.auth import RequireCapabilityBFF, TokenPayload
from src.schemas import resguardos as schemas_resguardos

router = APIRouter()
logger = logging.getLogger("bff.routers.resguardos")

# ==============================================================================
# SUBSISTEMA DE CONFIGURACIÓN DE RED E INVARIANTE DE DIRECCIONAMIENTO
# ==============================================================================
MS_RESGUARDOS_BASE_URL = os.getenv("MS_RESGUARDOS_URL", "http://ms_resguardo_api:8000").rstrip("/")
MS_RESGUARDOS_ENDPOINT = f"{MS_RESGUARDOS_BASE_URL}/resguardos"

MS_BIENES_ROUTE        = f"{os.getenv('MS_BIENES_URL', 'http://ms_bienes_api:8000').rstrip('/')}/bienes"
MS_UBICACIONES_ROUTE   = f"{os.getenv('MS_UBICACIONES_URL', 'http://ms_ubicaciones_api:8000').rstrip('/')}/ubicaciones"
MS_DEPARTAMENTOS_ROUTE = f"{os.getenv('MS_UBICACIONES_URL', 'http://ms_ubicaciones_api:8000').rstrip('/')}/departamentos"
MS_PERSONAS_ROUTE      = f"{os.getenv('MS_PERSONAS_URL', 'http://ms_personas_api:8000').rstrip('/')}/personas"


# ==============================================================================
# FUNCIONES AUXILIARES DE HIDRATACIÓN (ORQUESTACIÓN ASÍNCRONA)
# ==============================================================================
async def hidratar_un_resguardo(
    resguardo: dict, 
    headers: dict, 
    client: httpx.AsyncClient
) -> schemas_resguardos.MisResguardosOut:
    id_bien = resguardo["id_bien"]
    id_aula = resguardo["id_aula"]
    id_edificio = resguardo["id_edificio"]
    id_departamento = resguardo["id_departamento"]

    tareas = [
        client.get(f"{MS_BIENES_ROUTE}/{id_bien}", headers=headers),
        client.get(f"{MS_UBICACIONES_ROUTE}/aulas/{id_aula}", headers=headers),
        client.get(f"{MS_UBICACIONES_ROUTE}/edificios/{id_edificio}", headers=headers),
        client.get(f"{MS_DEPARTAMENTOS_ROUTE}/{id_departamento}", headers=headers)
    ]
    
    respuestas = await asyncio.gather(*tareas, return_exceptions=True)
    
    def procesar_respuesta(r, nombre_servicio: str) -> dict:
        if isinstance(r, Exception):
            logger.error(f"Fallo de red al conectar con {nombre_servicio} durante hidratación: {str(r)}")
            return {}
        if r.status_code != 200:
            logger.warning(f"Microservicio {nombre_servicio} retornó código {r.status_code} en hidratación. Detalle: {r.text}")
            return {}
        return r.json()

    bien_data = procesar_respuesta(respuestas[0], "ms-bienes")
    aula_data = procesar_respuesta(respuestas[1], "ms-ubicaciones (aulas)")
    edificio_data = procesar_respuesta(respuestas[2], "ms-ubicaciones (edificios)")
    depto_data = procesar_respuesta(respuestas[3], "ms-ubicaciones (departamentos)")

    return schemas_resguardos.MisResguardosOut(
        id_asignacion=resguardo["id_asignacion"],
        fecha_inicio=resguardo["fecha_inicio"],
        dias_vigencia=resguardo["dias_vigencia"],
        bien=schemas_resguardos.BienResguardoOut(
            id_bien=id_bien,
            descripcion=bien_data.get("descripcion", "Información no disponible"),
            marca=bien_data.get("marca"),
            modelo=bien_data.get("modelo"),
            serie=bien_data.get("serie")
        ),
        ubicacion=schemas_resguardos.UbicacionResguardoOut(
            aula=aula_data.get("nombre", "N/D"),
            edificio=edificio_data.get("nombre", "N/D"),
            departamento=depto_data.get("nombre", "N/D")
        )
    )


async def hidratar_resguardo_completo(
    resguardo: dict, 
    headers: dict, 
    client: httpx.AsyncClient
) -> schemas_resguardos.ResguardoAdminOutBFF:
    id_bien = resguardo["id_bien"]
    id_aula = resguardo["id_aula"]
    id_edificio = resguardo["id_edificio"]
    id_departamento = resguardo["id_departamento"]
    curp_objetivo = resguardo["curp"]

    # Invariante de Contrato: Delegar la parametrización al motor de HTTPX para evitar fallos de escape
    personas_params = {
        "curp": curp_objetivo.upper().strip(),
        "limit": 1,
        "incluir_inactivos": "true"
    }

    tareas = [
        client.get(f"{MS_BIENES_ROUTE}/{id_bien}", headers=headers),
        client.get(f"{MS_UBICACIONES_ROUTE}/aulas/{id_aula}", headers=headers),
        client.get(f"{MS_UBICACIONES_ROUTE}/edificios/{id_edificio}", headers=headers),
        client.get(f"{MS_DEPARTAMENTOS_ROUTE}/{id_departamento}", headers=headers),
        client.get(MS_PERSONAS_ROUTE, params=personas_params, headers=headers)
    ]
    
    respuestas = await asyncio.gather(*tareas, return_exceptions=True)

    def procesar_respuesta(r, nombre_servicio: str) -> dict:
        if isinstance(r, Exception):
            logger.error(f"Fallo de red al conectar con {nombre_servicio} durante hidratación completa: {str(r)}")
            return {}
        if r.status_code != 200:
            # Exponer explícitamente el payload de error del microservicio en los logs del contenedor BFF
            logger.warning(f"Microservicio {nombre_servicio} retornó código {r.status_code} en hidratación completa. Detalle: {r.text}")
            return {}
        return r.json()

    bien_data = procesar_respuesta(respuestas[0], "ms-bienes")
    aula_data = procesar_respuesta(respuestas[1], "ms-ubicaciones (aulas)")
    edificio_data = procesar_respuesta(respuestas[2], "ms-ubicaciones (edificios)")
    depto_data = procesar_respuesta(respuestas[3], "ms-ubicaciones (departamentos)")
    personas_paginated_data = procesar_respuesta(respuestas[4], "ms-personas")
    
    # Extraer el registro individual de la estructura paginada devuelta por el Microservicio
    lista_personas = personas_paginated_data.get("data", [])
    
    if lista_personas and len(lista_personas) > 0:
        persona_data = lista_personas[0]
        nombres_final = persona_data.get("nombres", "Desconocido")
        apellidos_final = persona_data.get("apellidos", "Desconocido")
    else:
        nombres_final = "Desconocido"
        apellidos_final = "Desconocido"
    
    persona_final = {
        "curp": curp_objetivo, 
        "nombres": nombres_final, 
        "apellidos": apellidos_final
    }

    return schemas_resguardos.ResguardoAdminOutBFF(
        id_asignacion=resguardo["id_asignacion"],
        fecha_inicio=resguardo["fecha_inicio"],
        fecha_fin=resguardo.get("fecha_fin"),
        esta_activo=resguardo["esta_activo"],
        dias_vigencia=resguardo["dias_vigencia"],
        persona=schemas_resguardos.PersonaResguardoOut(**persona_final),
        bien=schemas_resguardos.BienResguardoOut(
            id_bien=id_bien,
            descripcion=bien_data.get("descripcion", "Información no disponible"),
            marca=bien_data.get("marca"),
            modelo=bien_data.get("modelo"),
            serie=bien_data.get("serie")
        ),
        ubicacion=schemas_resguardos.UbicacionResguardoOut(
            aula=aula_data.get("nombre", "N/D"),
            edificio=edificio_data.get("nombre", "N/D"),
            departamento=depto_data.get("nombre", "N/D")
        )
    )


# ==============================================================================
# ENDPOINTS: RUTA DEL RESGUARDANTE
# ==============================================================================
@router.get("/mis-resguardos", response_model=schemas_resguardos.MisResguardosPaginatedOut)
async def listar_mis_resguardos(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    curp = getattr(token_payload, "curp", None) or getattr(token_payload, "username", None)
    if not curp:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Operación inválida: El token de sesión no contiene la CURP o Identidad del usuario."
        )

    params = {"limit": limit, "offset": offset, "solo_vigentes": True, "incluir_borrados": False, "curp": curp}
    try:
        resguardos_resp = await client.get(MS_RESGUARDOS_ENDPOINT, params=params, headers=headers)
        if resguardos_resp.status_code != 200:
            raise HTTPException(status_code=resguardos_resp.status_code, detail="Error al recuperar asignaciones personales del microservicio.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Servicio de resguardos no disponible: {str(exc)}")

    resguardos_data = resguardos_resp.json()
    lista_resguardos_puros = resguardos_data.get("data", [])
    total_registros = resguardos_data.get("total", 0)

    tareas_hidratacion = [hidratar_un_resguardo(r, headers, client) for r in lista_resguardos_puros]
    resultados_finales = await asyncio.gather(*tareas_hidratacion)

    return schemas_resguardos.MisResguardosPaginatedOut(
        total=total_registros, limit=limit, offset=offset, data=resultados_finales
    )


# ==============================================================================
# ENDPOINTS: CRUD DEL ADMINISTRADOR
# ==============================================================================
@router.post("", response_model=schemas_resguardos.ResguardoAdminOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_asignacion_resguardo(
    request: Request,
    datos_entrada: schemas_resguardos.ResguardoCreateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}

    try:
        cuerpo_solicitud = datos_entrada.model_dump(mode="json")
        resp = await client.post(MS_RESGUARDOS_ENDPOINT, json=cuerpo_solicitud, headers=headers)
        
        if resp.status_code != status.HTTP_201_CREATED:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al procesar asignación en el microservicio."))
        
        resguardo_creado = resp.json()
        resguardo_hidratado = await hidratar_resguardo_completo(resguardo_creado, headers, client)
        return resguardo_hidratado
        
    except httpx.RequestError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Fallo de conexión con microservicio de resguardos: {str(exc)}")


@router.get("", response_model=schemas_resguardos.ResguardoAdminPaginatedOutBFF)
async def listar_todos_los_resguardos_institucionales(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    solo_vigentes: bool = Query(True),
    incluir_borrados: bool = Query(False),
    curp: Optional[str] = Query(None),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    params = {"limit": limit, "offset": offset, "solo_vigentes": solo_vigentes, "incluir_borrados": incluir_borrados}
    if curp:
        params["curp"] = curp

    try:
        resp = await client.get(MS_RESGUARDOS_ENDPOINT, params=params, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail="Error devuelto por el microservicio de resguardos.")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error de red con microservicio de resguardos: {str(exc)}")

    resguardos_data = resp.json()
    lista_puros = resguardos_data.get("data", [])
    total = resguardos_data.get("total", 0)

    tareas_hidratacion = [hidratar_resguardo_completo(r, headers, client) for r in lista_puros]
    resultados_finales = await asyncio.gather(*tareas_hidratacion)

    return schemas_resguardos.ResguardoAdminPaginatedOutBFF(
        total=total, limit=limit, offset=offset, data=resultados_finales
    )


@router.patch("/{id_asignacion}", response_model=schemas_resguardos.ResguardoAdminOutBFF)
async def modificar_asignacion_resguardo(
    request: Request,
    id_asignacion: UUID,
    datos_cambio: schemas_resguardos.ResguardoUpdateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}

    try:
        cuerpo_parcial = datos_cambio.model_dump(mode="json", exclude_unset=True)
        url_recurso = f"{MS_RESGUARDOS_ENDPOINT}/{id_asignacion}"
        
        resp = await client.patch(url_recurso, json=cuerpo_parcial, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "No se pudo actualizar el resguardo."))
        
        resguardo_modificado = resp.json()
        return await hidratar_resguardo_completo(resguardo_modificado, headers, client)
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error en comunicación interna: {str(e)}")


@router.post("/{id_asignacion}/cerrar", response_model=schemas_resguardos.ResguardoAdminOutBFF)
async def concluir_resguardo_ordinario(
    request: Request,
    id_asignacion: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}

    try:
        url_recurso = f"{MS_RESGUARDOS_ENDPOINT}/{id_asignacion}/cerrar"
        
        resp = await client.post(url_recurso, headers=headers)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al asentar fecha de fin."))
        
        resguardo_cerrado = resp.json()
        return await hidratar_resguardo_completo(resguardo_cerrado, headers, client)
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error de red interna: {str(e)}")


@router.delete("/{id_asignacion}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_baja_logica_resguardo(
    request: Request,
    id_asignacion: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    jwt_crudo = token_payload.raw_token
    headers = {"Authorization": f"Bearer {jwt_crudo}"}

    try:
        url_recurso = f"{MS_RESGUARDOS_ENDPOINT}/{id_asignacion}"
        
        resp = await client.delete(url_recurso, headers=headers)
        if resp.status_code != status.HTTP_204_NO_CONTENT:
            raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al aplicar baja lógica."))
        return
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error crítico de red: {str(e)}")