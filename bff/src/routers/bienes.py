import os
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from bff.src.schemas import bienes as schemas_bienes
from bff.src.dependencies.auth import RequireCapabilityBFF

router = APIRouter(prefix="/api/v1/bienes", tags=["BFF Catálogos y Bienes"])

MS_BIENES_URL = os.getenv("MS_BIENES_URL", "http://ms-bienes:8000")
# ==============================================================================
# OPERACIONES: BIENES (ACTIVOS FÍSICOS)
# ==============================================================================
@router.get(
    "", 
    response_model=schemas_bienes.BienPaginatedOutBFF,
    dependencies=[Depends(RequireCapabilityBFF("bienes:leer"))]
)
async def listar_bienes_revisor(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False)
):
    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Falta cabecera de autorización.")
    
    headers = {"Authorization": auth_header}
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    
    try:
        response = await client.get(f"{MS_BIENES_URL}/bienes", headers=headers, params=params)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Error devuelto por ms-bienes."))
        return response.json()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Fallo crítico de comunicación con ms-bienes: {str(e)}")


@router.get(
    "/{id_bien}", 
    response_model=schemas_bienes.BienOutBFF,
    dependencies=[Depends(RequireCapabilityBFF("bienes:leer"))]
)
async def obtener_bien_por_id(request: Request, id_bien: UUID):
    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    try:
        response = await client.get(f"{MS_BIENES_URL}/bienes/{id_bien}", headers=headers)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Activo no encontrado."))
        return response.json()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al conectar con ms-bienes: {str(e)}")


@router.post(
    "", 
    response_model=schemas_bienes.BienOutBFF,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RequireCapabilityBFF("bienes:crear"))]
)
async def crear_nuevo_bien(request: Request, bien_in: schemas_bienes.BienCreateBFF):
    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    try:
        response = await client.post(
            f"{MS_BIENES_URL}/bienes", 
            headers=headers, 
            json=bien_in.model_dump(mode="json")
        )
        if response.status_code != status.HTTP_201_CREATED:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "No se pudo crear el activo."))
        return response.json()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error en comunicación al crear activo: {str(e)}")


@router.patch(
    "/{id_bien}", 
    response_model=schemas_bienes.BienOutBFF,
    dependencies=[Depends(RequireCapabilityBFF("bienes:editar"))]
)
async def modificar_bien(request: Request, id_bien: UUID, bien_in: schemas_bienes.BienUpdateBFF):
    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    try:
        response = await client.patch(
            f"{MS_BIENES_URL}/bienes/{id_bien}", 
            headers=headers, 
            json=bien_in.model_dump(mode="json", exclude_unset=True)
        )
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "No se pudo actualizar el activo."))
        return response.json()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error en comunicación al actualizar activo: {str(e)}")


@router.delete(
    "/{id_bien}", 
    status_code=status.HTTP_204_NO_CONTENT
)
async def dar_de_baja_bien(request: Request, id_bien: UUID):
    # Protegido explícitamente dentro del cuerpo o mediante dependencias
    # Nota: Tu microservicio pide la capacidad "bienes:eliminar"
    dependency = RequireCapabilityBFF("bienes:eliminar")
    await dependency(request)

    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    try:
        response = await client.delete(f"{MS_BIENES_URL}/bienes/{id_bien}", headers=headers)
        if response.status_code != status.HTTP_204_NO_CONTENT:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "No se pudo eliminar el activo."))
        return
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error en comunicación al eliminar activo: {str(e)}")
# ==============================================================================
# OPERACIONES: SUBSISTEMA CATÁLOGO (TIPOS DE BIEN)
# ==============================================================================
@router.get(
    "/tipos-bien", 
    response_model=schemas_bienes.TipoBienPaginatedOutBFF,
    dependencies=[Depends(RequireCapabilityBFF("bienes:leer"))]
)
async def listar_tipos_bien_revisor(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    incluir_inactivos: bool = Query(False)
):
    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    
    headers = {"Authorization": auth_header}
    params = {"limit": limit, "offset": offset, "incluir_inactivos": incluir_inactivos}
    
    try:
        response = await client.get(f"{MS_BIENES_URL}/bienes/tipos-bien", headers=headers, params=params)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Error devuelto por ms-bienes."))
        return response.json()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Fallo crítico de comunicación con el catálogo de ms-bienes: {str(e)}")


@router.get(
    "/tipos-bien/{id_tipo}", 
    response_model=schemas_bienes.TipoBienOutBFF,
    dependencies=[Depends(RequireCapabilityBFF("bienes:leer"))]
)
async def obtener_tipo_bien_por_id(request: Request, id_tipo: UUID):
    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    try:
        response = await client.get(f"{MS_BIENES_URL}/bienes/tipos-bien/{id_tipo}", headers=headers)
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "Tipo de bien no encontrado."))
        return response.json()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error al conectar con ms-bienes: {str(e)}")


@router.post(
    "/tipos-bien", 
    response_model=schemas_bienes.TipoBienOutBFF, 
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RequireCapabilityBFF("bienes:editar"))]
)
async def crear_tipo_bien(request: Request, tipo_in: schemas_bienes.TipoBienCreateBFF):
    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    try:
        response = await client.post(
            f"{MS_BIENES_URL}/bienes/tipos-bien", 
            headers=headers, 
            json=tipo_in.model_dump(mode="json")
        )
        if response.status_code != status.HTTP_201_CREATED:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "No se pudo crear el tipo de bien."))
        return response.json()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error de comunicación al crear tipo de bien: {str(e)}")


@router.patch(
    "/tipos-bien/{id_tipo}", 
    response_model=schemas_bienes.TipoBienOutBFF,
    dependencies=[Depends(RequireCapabilityBFF("bienes:editar"))]
)
async def modificar_tipo_bien(request: Request, id_tipo: UUID, tipo_in: schemas_bienes.TipoBienUpdateBFF):
    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    try:
        response = await client.patch(
            f"{MS_BIENES_URL}/bienes/tipos-bien/{id_tipo}", 
            headers=headers, 
            json=tipo_in.model_dump(mode="json", exclude_unset=True)
        )
        if response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "No se pudo actualizar el tipo de bien."))
        return response.json()
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error de comunicación al actualizar tipo de bien: {str(e)}")


@router.delete(
    "/tipos-bien/{id_tipo}", 
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(RequireCapabilityBFF("bienes:editar"))]
)
async def dar_de_baja_tipo_bien(request: Request, id_tipo: UUID):
    client = request.app.state.http_client
    auth_header = request.headers.get("Authorization")
    headers = {"Authorization": auth_header} if auth_header else {}

    try:
        response = await client.delete(f"{MS_BIENES_URL}/bienes/tipos-bien/{id_tipo}", headers=headers)
        if response.status_code != status.HTTP_204_NO_CONTENT:
            raise HTTPException(status_code=response.status_code, detail=response.json().get("detail", "No se pudo eliminar el tipo de bien."))
        return
    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error de comunicación al dar de baja el tipo de bien: {str(e)}")