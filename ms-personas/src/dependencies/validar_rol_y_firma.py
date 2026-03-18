import httpx
import logging
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.dependencies.manejo_JWT import decode_token 

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

security_scheme = HTTPBearer()

AUTH_SERVICE_URL = "http://api-ms-usuarios:8000/auth/verificar-acceso"

async def validate_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict:
    payload = decode_token(credentials.credentials)
    if not payload:
        # Si llega aquí, el token falló en Firma, Exp, Iss o Aud.
        logger.warning("Intento de acceso con token inválido o de otra audiencia/emisor.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token no válido para este ecosistema o ha expirado"
        )
    return payload

async def validate_role_permission(request: Request, payload: dict = Depends(validate_jwt_token)) -> bool:
    """Valida los permisos del Rol llamando al Microservicio de Usuarios."""
    user_roles = payload.get("roles", [])
    
    raw_path = request.scope["route"].path
    path = raw_path.rstrip("/") if raw_path != "/" else "/"
    method = request.method.upper()

    Timeou_config=httpx.Timeout(3.0)

    async with httpx.AsyncClient(timeout=Timeou_config) as client:
        try:
            response = await client.post(
                AUTH_SERVICE_URL,
                json={
                    "roles": user_roles,
                    "path": path,
                    "metodo": method
                },
            )
            
            if response.status_code != 200:
                logger.error(f"Error en Auth Service: {response.status_code}")
                raise HTTPException(status_code=403, detail="Error en validación de permisos")

            data = response.json()
            if not data.get("permitido"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"No tienes permiso para {method} en {path}"
                )

        except httpx.TimeoutException as exc:
            logger.error(f"Timeout al conectar con ms-usuarios: {exc}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT, 
                detail="Servicio de autorización tardó demasiado en responder"
            )
        except httpx.RequestError as exc:
            logger.error(f"Error de conexión con ms-usuarios: {exc}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Servicio de autorización no disponible momentáneamente"
            )
    return True

async def require_authz(_: bool = Depends(validate_role_permission)):
    """Dependencia final para usar en los routers."""
    return True