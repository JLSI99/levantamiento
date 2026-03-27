import asyncio
import httpx
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Header
from src.core.config import settings
from src.dependencies.auth_global import verificar_permiso_bff
from src.schemas.resguardos_bff import ResguardoVistaUI

router = APIRouter(
    prefix="/api/v1/resguardos-vista",
    tags=["BFF Resguardos Vista"],
    dependencies=[Depends(verificar_permiso_bff)]
)

@router.get("/{id_asignacion}", response_model=ResguardoVistaUI)
async def obtener_resguardo_completo(id_asignacion: UUID, authorization: str = Header(...)):
    headers = {"Authorization": authorization}
    
    async with httpx.AsyncClient() as client:
        # 1. Obtenemos el resguardo base
        resp_resguardo = await client.get(f"{settings.ms_resguardos_url}/resguardos/{id_asignacion}", headers=headers)
        if resp_resguardo.status_code == 404:
            raise HTTPException(status_code=404, detail="Resguardo no encontrado")
            
        resguardo = resp_resguardo.json()
        
        # OJO: Asegúrate de que estos nombres coincidan con los campos de tu AsignacionOut
        id_bien = resguardo.get("id_bien")
        id_aula = resguardo.get("id_aula")
        id_usuario = resguardo.get("id_usuario") or resguardo.get("id_empleado_asignado")
        
        # 2. Peticiones concurrentes (Bienes, Aulas, Usuarios)
        peticiones = [
            client.get(f"{settings.ms_bienes_url}/bienes/{id_bien}", headers=headers),
            client.get(f"{settings.ms_ubicaciones_url}/aulas/{id_aula}", headers=headers),
            client.get(f"{settings.ms_auth_url}/users/{id_usuario}", headers=headers)
        ]
        
        respuestas = await asyncio.gather(*peticiones, return_exceptions=True)
        resp_bien, resp_aula, resp_usuario = respuestas
        
        bien_data = resp_bien.json() if isinstance(resp_bien, httpx.Response) and resp_bien.status_code == 200 else {}
        aula_data = resp_aula.json() if isinstance(resp_aula, httpx.Response) and resp_aula.status_code == 200 else {}
        usuario_data = resp_usuario.json() if isinstance(resp_usuario, httpx.Response) and resp_usuario.status_code == 200 else {}
        
        # 3. Buscar a la Persona por CURP (Secuencial, porque dependemos del paso anterior)
        persona_data = {}
        curp = usuario_data.get("curp")
        if curp:
            # IMPORTANTE: Requerirás que tu ms-personas soporte filtrar por curp (ej. /personas?curp=...)
            resp_persona = await client.get(f"{settings.ms_personas_url}/personas?curp={curp}", headers=headers)
            if resp_persona.status_code == 200:
                data_list = resp_persona.json().get("data", [])
                if data_list:
                    persona_data = data_list[0]

        # 4. Construimos el nombre completo
        nombres = persona_data.get("nombres", "Desconocido")
        apellidos = persona_data.get("apellidos", "")
        nombre_completo = f"{nombres} {apellidos}".strip()

        # 5. Mapeo final al Schema UI
        estado_resguardo = "Activo" if resguardo.get("esta_activo") and not resguardo.get("fecha_fin") else "Inactivo/Terminado"

        return {
            "id_asignacion": resguardo["id_asignacion"],
            "fecha_inicio": resguardo["fecha_inicio"],
            "fecha_fin": resguardo.get("fecha_fin"),
            "estado": estado_resguardo,
            "bien": {
                "id_bien": bien_data.get("id_bien"),
                "descripcion": bien_data.get("descripcion", "N/A"),
                "serie": bien_data.get("serie", "N/A"),
                "marca": bien_data.get("marca", "N/A"),
                "modelo": bien_data.get("modelo", "N/A")
            },
            "ubicacion": {
                "id_aula": aula_data.get("id_aula"),
                "nombre_aula": aula_data.get("nombre", "N/A")
            },
            "responsable": {
                "id_usuario": usuario_data.get("id_usuario"),
                "username": usuario_data.get("username", "N/A"),
                "email": usuario_data.get("email", "N/A"),
                "curp": curp or "N/A",
                "nombre_completo": nombre_completo
            }
        }