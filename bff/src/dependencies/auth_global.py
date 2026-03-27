import httpx
from fastapi import Request, HTTPException, Header
from src.core.config import settings

async def verificar_permiso_bff(request: Request, authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token no proporcionado")
    
    async with httpx.AsyncClient() as client:
        # Aquí validamos el token contra tu ms-usuarios
        # Ajusta la ruta "/auth/verificar-acceso" según como lo tengas en tu ms-usuarios
        try:
            response = await client.get(
                f"{settings.ms_auth_url}/auth/me", # O el endpoint que valide el token
                headers={"Authorization": authorization}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Token inválido o expirado")
        except httpx.RequestError:
            raise HTTPException(status_code=503, detail="Servicio de autenticación no disponible")
            
    return authorization