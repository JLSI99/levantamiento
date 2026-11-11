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

MS_RESGUARDOS_BASE_URL = os.getenv("MS_RESGUARDOS_URL", "http://ms_resguardo_api:8000").rstrip("/")
MS_RESGUARDOS_ENDPOINT = f"{MS_RESGUARDOS_BASE_URL}/resguardos"
MS_BIENES_ROUTE        = f"{os.getenv('MS_BIENES_URL', 'http://ms_bienes_api:8000').rstrip('/')}/bienes"
MS_UBICACIONES_ROUTE   = f"{os.getenv('MS_UBICACIONES_URL', 'http://ms_ubicaciones_api:8000').rstrip('/')}/ubicaciones"
MS_DEPARTAMENTOS_ROUTE = f"{os.getenv('MS_UBICACIONES_URL', 'http://ms_ubicaciones_api:8000').rstrip('/')}/departamentos"
MS_PERSONAS_ROUTE      = f"{os.getenv('MS_PERSONAS_URL', 'http://ms_personas_api:8000').rstrip('/')}/personas"

# --- FUNCIONES DE HIDRATACIÓN ASÍNCRONA ---
async def hidratar_un_resguardo(resguardo: dict, headers: dict, client: httpx.AsyncClient) -> schemas_resguardos.MisResguardosOut:
    numero_inventario = resguardo["numero_inventario"]
    id_aula = resguardo["id_aula"]
    id_edificio = resguardo["id_edificio"]
    id_departamento = resguardo["id_departamento"]

    tareas = [
        client.get(f"{MS_BIENES_ROUTE}/por-inventario/{numero_inventario}", headers=headers),
        client.get(f"{MS_UBICACIONES_ROUTE}/aulas/{id_aula}", headers=headers),
        client.get(f"{MS_UBICACIONES_ROUTE}/edificios/{id_edificio}", headers=headers),
        client.get(f"{MS_DEPARTAMENTOS_ROUTE}/{id_departamento}", headers=headers)
    ]
    respuestas = await asyncio.gather(*tareas, return_exceptions=True)

    def proc(r):
        return r.json() if not isinstance(r, Exception) and hasattr(r, 'status_code') and r.status_code == 200 else {}

    bien_data, aula_data, edificio_data, depto_data = [proc(r) for r in respuestas]

    return schemas_resguardos.MisResguardosOut(
        id_asignacion=resguardo["id_asignacion"],
        fecha_inicio=resguardo["fecha_inicio"],
        dias_vigencia=resguardo["dias_vigencia"],
        bien=schemas_resguardos.BienResguardoOut(
            numero_inventario=numero_inventario,
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

async def hidratar_resguardo_completo(resguardo: dict, headers: dict, client: httpx.AsyncClient) -> schemas_resguardos.ResguardoAdminOutBFF:
    numero_inventario = resguardo["numero_inventario"]
    id_aula = resguardo["id_aula"]
    id_edificio = resguardo["id_edificio"]
    id_departamento = resguardo["id_departamento"]
    curp_objetivo = resguardo["curp"]

    personas_params = {"curp": curp_objetivo.upper().strip(), "limit": 1, "incluir_inactivos": "true"}

    tareas = [
        client.get(f"{MS_BIENES_ROUTE}/por-inventario/{numero_inventario}", headers=headers),
        client.get(f"{MS_UBICACIONES_ROUTE}/aulas/{id_aula}", headers=headers),
        client.get(f"{MS_UBICACIONES_ROUTE}/edificios/{id_edificio}", headers=headers),
        client.get(f"{MS_DEPARTAMENTOS_ROUTE}/{id_departamento}", headers=headers),
        client.get(MS_PERSONAS_ROUTE, params=personas_params, headers=headers)
    ]
    respuestas = await asyncio.gather(*tareas, return_exceptions=True)

    def proc(r):
        return r.json() if not isinstance(r, Exception) and hasattr(r, 'status_code') and r.status_code == 200 else {}

    bien_data, aula_data, edificio_data, depto_data, personas_data = [proc(r) for r in respuestas]
    lista_personas = personas_data.get("data", [])
    p_info = lista_personas[0] if lista_personas else {}

    return schemas_resguardos.ResguardoAdminOutBFF(
        id_asignacion=resguardo["id_asignacion"],
        fecha_inicio=resguardo["fecha_inicio"],
        fecha_fin=resguardo.get("fecha_fin"),
        esta_activo=resguardo["esta_activo"],
        dias_vigencia=resguardo["dias_vigencia"],
        persona=schemas_resguardos.PersonaResguardoOut(
            curp=curp_objetivo,
            nombres=p_info.get("nombres", "Desconocido"),
            apellidos=p_info.get("apellidos", "Desconocido")
        ),
        bien=schemas_resguardos.BienResguardoOut(
            numero_inventario=numero_inventario,
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

async def hidratar_solicitud_resguardo(solicitud: dict, headers: dict, client: httpx.AsyncClient) -> schemas_resguardos.SolicitudResguardoOutBFF:
    bien_sol = solicitud.get("bien_solicitado", "Requerimiento no especificado")
    id_aula = solicitud["id_aula"]
    id_edific = solicitud["id_edificio"]
    id_depto = solicitud["id_departamento"]
    curp_sol = solicitud["curp_solicitante"]
    curp_res = solicitud.get("curp_resolutor")

    tareas = [
        client.get(f"{MS_UBICACIONES_ROUTE}/aulas/{id_aula}", headers=headers),
        client.get(f"{MS_UBICACIONES_ROUTE}/edificios/{id_edific}", headers=headers),
        client.get(f"{MS_DEPARTAMENTOS_ROUTE}/{id_depto}", headers=headers),  # Corrección: id_depto
        client.get(MS_PERSONAS_ROUTE, params={"curp": curp_sol.upper().strip(), "limit": 1}, headers=headers)
    ]
    if curp_res:
        tareas.append(client.get(MS_PERSONAS_ROUTE, params={"curp": curp_res.upper().strip(), "limit": 1}, headers=headers))

    respuestas = await asyncio.gather(*tareas, return_exceptions=True)

    def proc(r):
        return r.json() if not isinstance(r, Exception) and hasattr(r, 'status_code') and r.status_code == 200 else {}

    aula_data = proc(respuestas[0])
    edificio_data = proc(respuestas[1])
    depto_data = proc(respuestas[2])
    solic_p_data = proc(respuestas[3]).get("data", [])

    solic_info = solic_p_data[0] if solic_p_data else {}
    solicitante_obj = schemas_resguardos.PersonaResguardoOut(
        curp=curp_sol,
        nombres=solic_info.get("nombres", "Desconocido"),
        apellidos=solic_info.get("apellidos", "Desconocido")
    )

    resolutor_obj = None
    if curp_res and len(respuestas) > 4:
        res_p_data = proc(respuestas[4]).get("data", [])
        res_info = res_p_data[0] if res_p_data else {}
        resolutor_obj = schemas_resguardos.PersonaResguardoOut(
            curp=curp_res,
            nombres=res_info.get("nombres", "Desconocido"),
            apellidos=res_info.get("apellidos", "Desconocido")
        )

    return schemas_resguardos.SolicitudResguardoOutBFF(
        id_solicitud=solicitud["id_solicitud"],
        bien_solicitado=bien_sol,
        fecha_solicitud=solicitud["fecha_solicitud"],
        estado=solicitud["estado"],
        justificacion=solicitud.get("justificacion"),
        fecha_resolucion=solicitud.get("fecha_resolucion"),
        comentario_resolucion=solicitud.get("comentario_resolucion"),
        solicitante=solicitante_obj,
        resolutor=resolutor_obj,
        ubicacion=schemas_resguardos.UbicacionResguardoOut(
            aula=aula_data.get("nombre", "N/D"),
            edificio=edificio_data.get("nombre", "N/D"),
            departamento=depto_data.get("nombre", "N/D")
        )
    )

# --- RUTAS DE SOLICITUDES EN BFF ---
@router.post("/solicitudes", response_model=schemas_resguardos.SolicitudResguardoOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_solicitud_resguardo_bff(
    request: Request,
    datos: schemas_resguardos.SolicitudResguardoCreateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("solicitudes_resguardo:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    
    resp = await client.post(f"{MS_RESGUARDOS_BASE_URL}/resguardos/solicitudes", json=datos.model_dump(mode="json"), headers=headers)
    if resp.status_code != status.HTTP_201_CREATED:
        raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al crear la solicitud."))
    return await hidratar_solicitud_resguardo(resp.json(), headers, client)

@router.get("/solicitudes/mis-solicitudes", response_model=schemas_resguardos.SolicitudResguardoPaginatedOutBFF)
async def listar_mis_solicitudes_bff(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("solicitudes_resguardo:mis_solicitudes"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    params = {"limit": limit, "offset": offset}
    
    resp = await client.get(f"{MS_RESGUARDOS_BASE_URL}/resguardos/solicitudes/mis-solicitudes", params=params, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Error al recuperar mis solicitudes.")
    
    data = resp.json()
    resultados = await asyncio.gather(*[hidratar_solicitud_resguardo(s, headers, client) for s in data.get("data", [])])
    return schemas_resguardos.SolicitudResguardoPaginatedOutBFF(total=data.get("total", 0), limit=limit, offset=offset, data=resultados)

@router.get("/solicitudes", response_model=schemas_resguardos.SolicitudResguardoPaginatedOutBFF)
async def listar_solicitudes_institucionales_bff(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    estado: Optional[str] = Query(None),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("solicitudes_resguardo:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    params = {"limit": limit, "offset": offset}
    if estado: 
        params["estado"] = estado

    resp = await client.get(f"{MS_RESGUARDOS_BASE_URL}/resguardos/solicitudes", params=params, headers=headers)
    if resp.status_code != 200:
        detail_msg = resp.json().get("detail", "Error al listar la bandeja de solicitudes.") if hasattr(resp, "json") else "Error al listar la bandeja de solicitudes."
        raise HTTPException(status_code=resp.status_code, detail=detail_msg)

    data = resp.json()
    resultados = await asyncio.gather(*[hidratar_solicitud_resguardo(s, headers, client) for s in data.get("data", [])])
    return schemas_resguardos.SolicitudResguardoPaginatedOutBFF(total=data.get("total", 0), limit=limit, offset=offset, data=resultados)

@router.post("/solicitudes/{id_solicitud}/aprobar", response_model=schemas_resguardos.ResguardoAdminOutBFF)
async def aprobar_solicitud_bff(
    request: Request,
    id_solicitud: UUID,
    datos: schemas_resguardos.SolicitudResguardoAprobarBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("solicitudes_resguardo:aprobar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    resp = await client.post(f"{MS_RESGUARDOS_BASE_URL}/resguardos/solicitudes/{id_solicitud}/aprobar", json=datos.model_dump(mode="json"), headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "No se pudo aprobar la solicitud."))

    asignacion_creada = resp.json()
    return await hidratar_resguardo_completo(asignacion_creada, headers, client)

@router.post("/solicitudes/{id_solicitud}/rechazar", response_model=schemas_resguardos.SolicitudResguardoOutBFF)
async def rechazar_solicitud_bff(
    request: Request,
    id_solicitud: UUID,
    datos: schemas_resguardos.SolicitudResguardoRechazarBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("solicitudes_resguardo:aprobar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    resp = await client.post(f"{MS_RESGUARDOS_BASE_URL}/resguardos/solicitudes/{id_solicitud}/rechazar", json=datos.model_dump(mode="json"), headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "No se pudo rechazar la solicitud."))

    solicitud_rechazada = resp.json()
    return await hidratar_solicitud_resguardo(solicitud_rechazada, headers, client)

# --- RUTAS DE ASIGNACIONES (RESGUARDOS) ---
@router.get("/mis-resguardos", response_model=schemas_resguardos.MisResguardosPaginatedOut)
async def listar_mis_resguardos(
    request: Request, 
    limit: int = Query(10, ge=1, le=100), 
    offset: int = Query(0, ge=0), 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("MisResguardos:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    params = {"limit": limit, "offset": offset, "solo_vigentes": True, "incluir_borrados": False}
    resp = await client.get(f"{MS_RESGUARDOS_ENDPOINT}/mis-resguardos", params=params, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Error al recuperar asignaciones personales.")
    data = resp.json()
    resultados = await asyncio.gather(*[hidratar_un_resguardo(r, headers, client) for r in data.get("data", [])])
    return schemas_resguardos.MisResguardosPaginatedOut(total=data.get("total", 0), limit=limit, offset=offset, data=resultados)

@router.post("", response_model=schemas_resguardos.ResguardoAdminOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_asignacion_resguardo(
    request: Request, 
    datos_entrada: schemas_resguardos.ResguardoCreateBFF, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    resp = await client.post(MS_RESGUARDOS_ENDPOINT, json=datos_entrada.model_dump(mode="json"), headers=headers)
    if resp.status_code != status.HTTP_201_CREATED:
        raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al crear asignación."))
    return await hidratar_resguardo_completo(resp.json(), headers, client)

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
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    params = {"limit": limit, "offset": offset, "solo_vigentes": solo_vigentes, "incluir_borrados": incluir_borrados}
    if curp: params["curp"] = curp
    resp = await client.get(MS_RESGUARDOS_ENDPOINT, params=params, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Error devuelto por el microservicio de resguardos.")
    data = resp.json()
    resultados = await asyncio.gather(*[hidratar_resguardo_completo(r, headers, client) for r in data.get("data", [])])
    return schemas_resguardos.ResguardoAdminPaginatedOutBFF(total=data.get("total", 0), limit=limit, offset=offset, data=resultados)

@router.patch("/{id_asignacion}", response_model=schemas_resguardos.ResguardoAdminOutBFF)
async def modificar_asignacion_resguardo(
    request: Request, 
    id_asignacion: UUID, 
    datos_cambio: schemas_resguardos.ResguardoUpdateBFF, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    resp = await client.patch(f"{MS_RESGUARDOS_ENDPOINT}/{id_asignacion}", json=datos_cambio.model_dump(mode="json", exclude_unset=True), headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al actualizar asignación."))
    return await hidratar_resguardo_completo(resp.json(), headers, client)

@router.post("/{id_asignacion}/cerrar", response_model=schemas_resguardos.ResguardoAdminOutBFF)
async def concluir_resguardo_ordinario(
    request: Request, 
    id_asignacion: UUID, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    resp = await client.post(f"{MS_RESGUARDOS_ENDPOINT}/{id_asignacion}/cerrar", headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al cerrar resguardo."))
    return await hidratar_resguardo_completo(resp.json(), headers, client)

@router.delete("/{id_asignacion}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_baja_logica_resguardo(
    request: Request, 
    id_asignacion: UUID, 
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("resguardos:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}
    resp = await client.delete(f"{MS_RESGUARDOS_ENDPOINT}/{id_asignacion}", headers=headers)
    if resp.status_code != status.HTTP_204_NO_CONTENT:
        raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al borrar resguardo."))
    return