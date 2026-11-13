import os
import asyncio
import httpx
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query, UploadFile, File, status

from src.schemas import bienes as schemas_bienes
from src.dependencies.auth import RequireCapabilityBFF, TokenPayload

router = APIRouter()

MS_BIENES_URL         = os.getenv("MS_BIENES_URL", "http://ms_bienes_api:8000").rstrip("/")
MS_BIENES_ROUTE       = f"{MS_BIENES_URL}/bienes"
MS_TIPOS_ROUTE        = f"{MS_BIENES_URL}/bienes/tipos-bien"
MS_TAGS_ROUTE         = f"{MS_BIENES_URL}/bienes/tags-bien"
MS_INSPECCIONES_ROUTE = f"{MS_BIENES_URL}/bienes/inspecciones"
MS_PERSONAS_ROUTE     = f"{os.getenv('MS_PERSONAS_URL', 'http://ms_personas_api:8000').rstrip('/')}/personas"


# ==========================================
# HELPER DE HIDRATACIÓN PARA INSPECCIONES
# ==========================================

async def hidratar_inspeccion_bien(
    inspeccion: dict,
    headers: dict,
    client: httpx.AsyncClient
) -> schemas_bienes.InspeccionBienOutBFF:
    curp_auditor = inspeccion["curp_auditor"].upper().strip()
    p_info = {}

    try:
        resp_p = await client.get(
            MS_PERSONAS_ROUTE,
            params={"curp": curp_auditor, "limit": 1, "incluir_inactivos": "true"},
            headers=headers
        )
        if resp_p.status_code == status.HTTP_200_OK:
            lista_p = resp_p.json().get("data", [])
            if lista_p:
                p_info = lista_p[0]
    except Exception:
        p_info = {}

    bien_raw = inspeccion.get("bien", {})

    return schemas_bienes.InspeccionBienOutBFF(
        id_inspeccion=inspeccion["id_inspeccion"],
        id_bien=inspeccion["id_bien"],
        esta_presente=inspeccion["esta_presente"],
        estado_fisico=inspeccion["estado_fisico"],
        observaciones=inspeccion.get("observaciones"),
        fecha_inspeccion=inspeccion["fecha_inspeccion"],
        auditor=schemas_bienes.PersonaAuditorOutBFF(
            curp=curp_auditor,
            nombres=p_info.get("nombres", "Desconocido"),
            apellidos=p_info.get("apellidos", "Desconocido")
        ),
        bien=schemas_bienes.BienResumenInspeccionOutBFF(
            id_bien=bien_raw["id_bien"],
            numero_inventario=bien_raw["numero_inventario"],
            descripcion=bien_raw["descripcion"],
            marca=bien_raw.get("marca"),
            modelo=bien_raw.get("modelo"),
            serie=bien_raw.get("serie"),
            esta_activo=bien_raw.get("esta_activo", True),
            imagenes=bien_raw.get("imagenes", [])
        )
    )


# ==========================================
# ENDPOINTS: TIPOS DE BIEN
# ==========================================

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


# ==========================================
# ENDPOINTS: TAGS / ETIQUETAS DE BIEN
# ==========================================

@router.get("/tags-bien", response_model=schemas_bienes.TagBienPaginatedOutBFF, status_code=status.HTTP_200_OK)
async def listar_tags_bien_revisor(
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
        response = await client.get(MS_TAGS_ROUTE, headers=headers, params=params)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.get("/tags-bien/{id_tag}", response_model=schemas_bienes.TagBienOutBFF, status_code=status.HTTP_200_OK)
async def obtener_tag_bien_por_id(
    request: Request,
    id_tag: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        response = await client.get(f"{MS_TAGS_ROUTE}/{id_tag}", headers=headers)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.post("/tags-bien", response_model=schemas_bienes.TagBienOutBFF, status_code=status.HTTP_201_CREATED)
async def crear_tag_bien(
    request: Request,
    tag_in: schemas_bienes.TagBienCreateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:crear"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        payload = tag_in.model_dump(mode="json")
        response = await client.post(MS_TAGS_ROUTE, headers=headers, json=payload)
        if response.status_code != status.HTTP_201_CREATED:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.patch("/tags-bien/{id_tag}", response_model=schemas_bienes.TagBienOutBFF, status_code=status.HTTP_200_OK)
async def modificar_tag_bien(
    request: Request,
    id_tag: UUID,
    tag_in: schemas_bienes.TagBienUpdateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        payload = tag_in.model_dump(mode="json", exclude_unset=True)
        response = await client.patch(f"{MS_TAGS_ROUTE}/{id_tag}", headers=headers, json=payload)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

@router.delete("/tags-bien/{id_tag}", status_code=status.HTTP_204_NO_CONTENT)
async def dar_de_baja_tag_bien(
    request: Request,
    id_tag: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        response = await client.delete(f"{MS_TAGS_ROUTE}/{id_tag}", headers=headers)
        if response.status_code != status.HTTP_204_NO_CONTENT:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


# ==========================================
# ENDPOINTS: CHECKLIST / INSPECCIONES FÍSICAS
# ==========================================

@router.post("/inspecciones", response_model=schemas_bienes.InspeccionBienOutBFF, status_code=status.HTTP_201_CREATED)
async def registrar_inspeccion_bien_bff(
    request: Request,
    inspeccion_in: schemas_bienes.InspeccionBienCreateBFF,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        payload = inspeccion_in.model_dump(mode="json")
        response = await client.post(MS_INSPECCIONES_ROUTE, headers=headers, json=payload)
        if response.status_code != status.HTTP_201_CREATED:
            try:
                error_detail = response.json().get("detail")
            except Exception:
                error_detail = response.text or "Error al registrar la verificación física."
            raise HTTPException(status_code=response.status_code, detail=error_detail)

        return await hidratar_inspeccion_bien(response.json(), headers, client)
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Servicio de bienes no disponible: {str(e)}")

@router.get("/inspecciones", response_model=schemas_bienes.InspeccionBienPaginatedOutBFF, status_code=status.HTTP_200_OK)
async def listar_inspecciones_bienes_bff(
    request: Request,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    numero_inventario: Optional[str] = Query(None),
    esta_presente: Optional[bool] = Query(None),
    estado_fisico: Optional[str] = Query(None),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    params = {"limit": limit, "offset": offset}
    if numero_inventario and numero_inventario.strip():
        params["numero_inventario"] = numero_inventario.strip()
    if esta_presente is not None:
        params["esta_presente"] = "true" if esta_presente else "false"
    if estado_fisico and estado_fisico.strip():
        params["estado_fisico"] = estado_fisico.strip()

    try:
        response = await client.get(MS_INSPECCIONES_ROUTE, headers=headers, params=params)
        if response.status_code != status.HTTP_200_OK:
            try:
                error_detail = response.json().get("detail")
            except Exception:
                error_detail = "Error al consultar el historial de inspecciones."
            raise HTTPException(status_code=response.status_code, detail=error_detail)

        body = response.json()
        items = body.get("data", [])
        resultados = await asyncio.gather(*[hidratar_inspeccion_bien(item, headers, client) for item in items])

        return schemas_bienes.InspeccionBienPaginatedOutBFF(
            total=body.get("total", 0),
            limit=limit,
            offset=offset,
            data=resultados
        )
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error de enlace en cluster: {str(e)}")

@router.delete("/inspecciones/{id_inspeccion}", status_code=status.HTTP_204_NO_CONTENT)
async def eliminar_inspeccion_bien_bff(
    request: Request,
    id_inspeccion: UUID,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:borrar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        response = await client.delete(f"{MS_INSPECCIONES_ROUTE}/{id_inspeccion}", headers=headers)
        if response.status_code != status.HTTP_204_NO_CONTENT:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail"))
        return
    except httpx.RequestError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))


# ==========================================
# ENDPOINTS: BIENES (ACTIVOS FIJOS)
# ==========================================

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
            try:
                error_detail = response.json().get("detail")
            except Exception:
                error_detail = response.text or "Error interno en el microservicio de bienes."
            raise HTTPException(status_code=response.status_code, detail=error_detail)

        return response.json()
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Servicio de bienes no disponible: {str(e)}"
        )

@router.get("/por-inventario/{numero_inventario}", response_model=schemas_bienes.BienOutBFF, status_code=status.HTTP_200_OK)
async def obtener_bien_por_numero_inventario(
    request: Request,
    numero_inventario: str,
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:leer"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        response = await client.get(f"{MS_BIENES_ROUTE}/por-inventario/{numero_inventario}", headers=headers)
        if response.status_code != status.HTTP_200_OK:
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


# ==========================================
# ENDPOINTS: GESTIÓN FOTOGRÁFICA (MULTIMEDIA)
# ==========================================

@router.post(
    "/{id_bien}/imagenes",
    response_model=List[schemas_bienes.ImagenBienOutBFF],
    status_code=status.HTTP_201_CREATED,
    summary="Subir y asociar una o varias imágenes (hasta 3 en total) a un bien patrimonial"
)
async def subir_imagen_bien(
    request: Request,
    id_bien: UUID,
    files: List[UploadFile] = File(..., description="Listado de archivos de imagen (JPEG, PNG, WEBP). Máximo 5MB cada uno."),
    token_payload: TokenPayload = Depends(RequireCapabilityBFF("bienes:editar"))
):
    client: httpx.AsyncClient = request.app.state.http_client
    headers = {"Authorization": f"Bearer {token_payload.raw_token}"}

    try:
        httpx_files = []
        for file in files:
            content = await file.read()
            httpx_files.append(("archivos", (file.filename, content, file.content_type)))

        response = await client.post(
            f"{MS_BIENES_ROUTE}/{id_bien}/imagenes",
            headers=headers,
            files=httpx_files
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
            detail=f"Falla de transporte de red al delegar la carga de imágenes: {str(e)}"
        )
    finally:
        for file in files:
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