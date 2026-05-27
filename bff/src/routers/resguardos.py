# bff/src/routers/resguardos.py
import os
import httpx
import asyncio
from fastapi import APIRouter, HTTPException, Request, status, Query, Depends
from src.schemas.resguardos import AsignacionCreateBFF, AsignacionPaginatedBFFOut
from src.dependencies.http import get_http_client

router = APIRouter(prefix="/resguardos", tags=["Resguardos Orchestrator"])

MS_RESGUARDOS_URL = os.getenv("MS_RESGUARDOS_URL", "http://ms_resguardos_api:8000")
MS_BIENES_URL = os.getenv("MS_BIENES_URL", "http://ms_bienes_api:8000")
MS_AUTH_URL = os.getenv("MS_AUTH_URL", "http://ms_usuarios_api:8000")

@router.post("/", status_code=status.HTTP_201_CREATED)
async def crear_resguardo(
    request: Request, 
    data: AsignacionCreateBFF,
    client: httpx.AsyncClient = Depends(get_http_client)
):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se proporcionó token de sesión")

    try:
        response = await client.post(
            f"{MS_RESGUARDOS_URL}/resguardos",
            json=data.model_dump(mode='json'),
            headers={"Authorization": auth_header}
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code, 
            detail=e.response.json().get("detail", "Error al crear resguardo")
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Resguardos no disponible")


@router.get("/", response_model=AsignacionPaginatedBFFOut)
async def listar_resguardos_detallados(
    request: Request, 
    limit: int = Query(10, ge=1, le=100), 
    offset: int = Query(0, ge=0),
    client: httpx.AsyncClient = Depends(get_http_client)
):
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No se proporcionó token de sesión")
    
    headers = {"Authorization": auth_header}
    
    # Paso 1: Recuperar el lote primario de resguardos (Llamada 1)
    try:
        res_resguardos = await client.get(
            f"{MS_RESGUARDOS_URL}/resguardos",
            params={"limit": limit, "offset": offset},
            headers=headers
        )
        res_resguardos.raise_for_status()
        envelope = res_resguardos.json()
        data_resguardos = envelope.get("data", [])
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Servicio de Resguardos no disponible")

    if not data_resguardos:
        return {"total": envelope.get("total", 0), "limit": limit, "offset": offset, "data": []}

    # Paso 2: Extraer conjuntos únicos de IDs para evitar duplicar llamadas de red
    bienes_ids = list({r["id_bien"] for r in data_resguardos})
    usuarios_ids = list({r["id_usuario"] for r in data_resguardos})

    # Paso 3: Resolver de forma concurrente y asíncrona la información de los catálogos (Llamadas 2 y 3)
    # Se optimiza a solo 2 llamadas en paralelo en lugar de 2N llamadas individuales
    tasks = [
        client.post(f"{MS_BIENES_URL}/bienes/bulk", json={"ids": bienes_ids}, headers=headers),
        client.post(f"{MS_AUTH_URL}/users/bulk", json={"ids": usuarios_ids}, headers=headers)
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Manejo robusto de errores de infraestructura
    if isinstance(results[0], Exception) or results[0].status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="El Catálogo de Bienes no respondió correctamente")
    if isinstance(results[1], Exception) or results[1].status_code != 200:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="El Servicio de Identidades no respondió correctamente")

    # Paso 4: Indexar las respuestas en diccionarios en memoria (Búsqueda tiempo constante O(1))
    bienes_map = {b["id_bien"]: b for b in results[0].json()}
    usuarios_map = {u["id_usuario"]: u for u in results[1].json()}

    # Paso 5: Ensamble lineal y seguro de la información compuesta
    resguardos_enriquecidos = []
    for r in data_resguardos:
        bien = bienes_map.get(r["id_bien"], {})
        user = usuarios_map.get(r["id_usuario"], {})
        
        nombre_compuesto = f"{bien.get('marca', '')} {bien.get('modelo', 'Bien Desconocido')}".strip()
        
        resguardos_enriquecidos.append({
            "id_asignacion": r["id_asignacion"],
            "fecha_inicio": r["fecha_inicio"],
            "bien_nombre": nombre_compuesto,
            "bien_serie": bien.get("serie", "N/A"),
            "usuario_nombre": user.get("username", "Usuario Desconocido"),
            "usuario_email": user.get("email", "S/D"),
            "esta_activo": r["esta_activo"]
        })

    return {
        "total": envelope.get("total", 0),
        "limit": envelope.get("limit", limit),
        "offset": envelope.get("offset", offset),
        "data": resguardos_enriquecidos
    }