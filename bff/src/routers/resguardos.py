import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from typing import List, Optional
from uuid import UUID

from src.dependencies.auth import RequireCapabilityBFF
from src.schemas import resguardos as schemas_resguardos

router = APIRouter(
    prefix="/api/v1/resguardos",
    tags=["BFF Módulo de Resguardos y Asignaciones"]
)

MS_RESGUARDOS_URL = "http://ms-resguardos:8000/resguardos"
MS_BIENES_URL = "http://ms-bienes:8000/bienes"
MS_UBICACIONES_URL = "http://ms-ubicaciones:8000"
MS_PERSONAS_URL = "http://ms-personas:8000/personas"
# ==============================================================================
# FUNCIONES AUXILIARES DE HIDRATACIÓN (ORQUESTACIÓN ASÍNCRONA)
# ==============================================================================
async def hidratar_un_resguardo(resguardo: dict, headers: dict) -> schemas_resguardos.MisResguardosOut:
    id_bien = resguardo["id_bien"]
    id_aula = resguardo["id_aula"]
    id_edificio = resguardo["id_edificio"]
    id_departamento = resguardo["id_departamento"]

    async with httpx.AsyncClient() as client:
        tareas = [
            client.get(f"{MS_BIENES_URL}/{id_bien}", headers=headers),
            client.get(f"{MS_UBICACIONES_URL}/ubicaciones/aulas/{id_aula}", headers=headers),
            client.get(f"{MS_UBICACIONES_URL}/ubicaciones/edificios/{id_edificio}", headers=headers),
            client.get(f"{MS_UBICACIONES_URL}/departamentos/{id_departamento}", headers=headers)
        ]
        respuestas = await asyncio.gather(*tareas, return_exceptions=True)
        
    bien_data = respuestas[0].json() if not isinstance(respuestas[0], Exception) and respuestas[0].status_code == 200 else {}
    aula_data = respuestas[1].json() if not isinstance(respuestas[1], Exception) and respuestas[1].status_code == 200 else {}
    edificio_data = respuestas[2].json() if not isinstance(respuestas[2], Exception) and respuestas[2].status_code == 200 else {}
    depto_data = respuestas[3].json() if not isinstance(respuestas[3], Exception) and respuestas[3].status_code == 200 else {}

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

async def hidratar_resguardo_completo(resguardo: dict, headers: dict) -> schemas_resguardos.ResguardoAdminOutBFF:

    id_bien = resguardo["id_bien"]
    id_aula = resguardo["id_aula"]
    id_edificio = resguardo["id_edificio"]
    id_departamento = resguardo["id_departamento"]
    curp_objetivo = resguardo["curp"]

    async with httpx.AsyncClient() as client:
        tareas = [
            client.get(f"{MS_BIENES_URL}/{id_bien}", headers=headers),
            client.get(f"{MS_UBICACIONES_URL}/ubicaciones/aulas/{id_aula}", headers=headers),
            client.get(f"{MS_UBICACIONES_URL}/ubicaciones/edificios/{id_edificio}", headers=headers),
            client.get(f"{MS_UBICACIONES_URL}/departamentos/{id_departamento}", headers=headers),
            client.get(f"{MS_PERSONAS_URL}", params={"curp": curp_objetivo}, headers=headers)
        ]
        respuestas = await asyncio.gather(*tareas, return_exceptions=True)

    bien_data = respuestas[0].json() if not isinstance(respuestas[0], Exception) and respuestas[0].status_code == 200 else {}
    aula_data = respuestas[1].json() if not isinstance(respuestas[1], Exception) and respuestas[1].status_code == 200 else {}
    edificio_data = respuestas[2].json() if not isinstance(respuestas[2], Exception) and respuestas[2].status_code == 200 else {}
    depto_data = respuestas[3].json() if not isinstance(respuestas[3], Exception) and respuestas[3].status_code == 200 else {}
    
    persona_final = {"curp": curp_objetivo, "nombres": "Desconocido", "apellidos": "Desconocido"}
    if not isinstance(respuestas[4], Exception) and respuestas[4].status_code == 200:
        personas_list = respuestas[4].json().get("data", [])
        if personas_list:
            p = personas_list[0]
            persona_final["nombres"] = p.get("nombres", "Desconocido")
            persona_final["apellidos"] = p.get("apellidos", "Desconocido")

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
    token_payload: dict = Depends(RequireCapabilityBFF("resguardos:leer"))
):
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    curp = token_payload.get("curp")
    
    if not curp:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Operación inválida: El token de sesión no contiene la CURP del usuario."
        )

    async with httpx.AsyncClient() as client:
        params = {"limit": limit, "offset": offset, "solo_vigentes": True, "incluir_borrados": False, "curp": curp}
        try:
            resguardos_resp = await client.get(MS_RESGUARDOS_URL, params=params, headers=headers)
            if resguardos_resp.status_code != 200:
                raise HTTPException(status_code=resguardos_resp.status_code, detail="Error al recuperar asignaciones personales.")
        except httpx.RequestError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Servicio no disponible: {str(exc)}")

    resguardos_data = resguardos_resp.json()
    lista_resguardos_puros = resguardos_data.get("data", [])
    total_registros = resguardos_data.get("total", 0)

    tareas_hidratacion = [hidratar_un_resguardo(r, headers) for r in lista_resguardos_puros]
    resultados_finales = await asyncio.gather(*tareas_hidratacion)

    return schemas_resguardos.MisResguardosPaginatedOut(
        total=total_registros, limit=limit, offset=offset, data=resultados_finales
    )
# ==============================================================================
# ENDPOINTS: CRUD DEL LEVANTADOR (OPERATIVO GENERAL INSTITUCIONAL)
# ==============================================================================
@router.post("", response_model=schemas_resguardos.ResguardoAdminOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_asignacion_resguardo(
    request: Request,
    datos_entrada: schemas_resguardos.ResguardoCreateBFF,
    token_payload: dict = Depends(RequireCapabilityBFF("resguardos:crear"))
):
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}

    async with httpx.AsyncClient() as client:
        try:
        
            resp = await client.post(MS_RESGUARDOS_URL, json=datos_entrada.model_dump(), headers=headers)
            if resp.status_code != status.HTTP_201_CREATED:
                raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al procesar asignación."))
            
            resguardo_creado = resp.json()
            resguardo_hidratado = await hidratar_resguardo_completo(resguardo_creado, headers)
            return resguardo_hidratado
            
        except httpx.RequestError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Fallo de conexión con microservicios: {str(exc)}")

@router.get("", response_model=schemas_resguardos.ResguardoAdminPaginatedOutBFF)
async def listar_todos_los_resguardos_institucionales(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    solo_vigentes: bool = Query(True),
    incluir_borrados: bool = Query(False),
    curp: Optional[str] = Query(None),
    token_payload: dict = Depends(RequireCapabilityBFF("resguardos:leer"))
):
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}
    
    params = {"limit": limit, "offset": offset, "solo_vigentes": solo_vigentes, "incluir_borrados": incluir_borrados}
    if curp:
        params["curp"] = curp

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(MS_RESGUARDOS_URL, params=params, headers=headers)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="Error devuelto por el microservicio de resguardos.")
        except httpx.RequestError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error de red: {str(exc)}")

    resguardos_data = resp.json()
    lista_puros = resguardos_data.get("data", [])
    total = resguardos_data.get("total", 0)

    tareas_hidratacion = [hidratar_resguardo_completo(r, headers) for r in lista_puros]
    resultados_finales = await asyncio.gather(*tareas_hidratacion)

    return schemas_resguardos.ResguardoAdminPaginatedOutBFF(
        total=total, limit=limit, offset=offset, data=resultados_finales
    )

@router.patch("/{id_asignacion}", response_model=schemas_resguardos.ResguardoAdminOutBFF)
async def modificar_asignacion_resguardo(
    id_asignacion: UUID,
    datos_cambio: schemas_resguardos.ResguardoUpdateBFF,
    token_payload: dict = Depends(RequireCapabilityBFF("resguardos:editar"))
):
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.patch(
                f"{MS_RESGUARDOS_URL}/{id_asignacion}", 
                json=datos_cambio.model_dump(exclude_unset=True), 
                headers=headers
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "No se pudo actualizar el resguardo."))
            
            resguardo_modificado = resp.json()
            return await hidratar_resguardo_completo(resguardo_modificado, headers)
        except httpx.RequestError as e:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error en comunicación interna: {str(e)}")

@router.post("/{id_asignacion}/cerrar", response_model=schemas_resguardos.ResguardoAdminOutBFF)
async def concluir_resguardo_ordinario(
    id_asignacion: UUID,
    token_payload: dict = Depends(RequireCapabilityBFF("resguardos:editar"))
):
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(f"{MS_RESGUARDOS_URL}/{id_asignacion}/cerrar", headers=headers)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al asentar fecha de fin."))
            
            resguardo_cerrado = resp.json()
            return await hidratar_resguardo_completo(resguardo_cerrado, headers)
        except httpx.RequestError as e:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error de red: {str(e)}")

@router.delete("/{id_asignacion}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_baja_logica_resguardo(
    id_asignacion: UUID,
    token_payload: dict = Depends(RequireCapabilityBFF("resguardos:eliminar"))
):
    jwt_crudo = token_payload.get("encoded_token")
    headers = {"Authorization": f"Bearer {jwt_crudo}"}

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.delete(f"{MS_RESGUARDOS_URL}/{id_asignacion}", headers=headers)
            if resp.status_code != status.HTTP_204_NO_CONTENT:
                raise HTTPException(status_code=resp.status_code, detail=resp.json().get("detail", "Error al aplicar baja lógica."))
            return
        except httpx.RequestError as e:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error crítico: {str(e)}")