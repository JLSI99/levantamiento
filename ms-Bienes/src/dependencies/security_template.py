from typing import Callable, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from src.dependencies.manejo_jwt import decode_token 
from src.dependencies.logger import setup_logger

logger = setup_logger(__name__)
security_scheme = HTTPBearer(auto_error=True)

class ValidadorSeguridad:
    def __init__(self, nombre_servicio: str, db_dependency: Optional[Callable] = None, tipo_token_estricto: Optional[str] = None):
        self.nombre_servicio = nombre_servicio
        self.get_db = db_dependency
        self.tipo_token_estricto = tipo_token_estricto

    async def validate_jwt_token(self, credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> dict:
        token = credentials.credentials
        if self.tipo_token_estricto:
            payload = decode_token(token, expected_type=self.tipo_token_estricto)
        else:
            payload = decode_token(token)
            
        if not payload:
            logger.warning(
                f"Acceso denegado en {self.nombre_servicio}: Firma JWT inválida o expirada",
                extra={"evento": "auth_token_invalido", "servicio": self.nombre_servicio}
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Token no válido para este ecosistema o ha expirado",
                headers={"WWW-Authenticate": "Bearer"}
            )
        return payload

    def inject_audit_context(self) -> Callable:

        async def _auditor(
            request: Request,
            payload: dict = Depends(self.validate_jwt_token)
        ) -> dict:
            usuario_email = payload.get("email", "desconocido@itsc.edu.mx")
            request.state.usuario_email = usuario_email
            return payload
        return _auditor

    def require_capability(self, required_cap: str) -> Callable:
        """
        Evaluador de capacidades basado en Claims (CapBAC) integrado al grafo de FastAPI.
        """
        auditor_dependency = self.inject_audit_context()

        async def _verifier(
            request: Request,
            payload: dict = Depends(auditor_dependency)
        ) -> dict:
            user_caps = payload.get("caps", [])
            
            if required_cap not in user_caps:
                raw_path = request.scope["route"].path if "route" in request.scope else request.url.path
                method = request.method.upper()
                client_ip = request.client.host if request.client else "unknown"
                
                logger.warning(
                    f"Autorización rechazada en {self.nombre_servicio}. Falta capacidad: {required_cap}",
                    extra={
                        "evento": "acceso_denegado",
                        "servicio": self.nombre_servicio,
                        "usuario": payload.get("email"),
                        "roles": payload.get("roles", []),
                        "path_intentado": raw_path,
                        "metodo_intentado": method,
                        "ip_origen": client_ip
                    }
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Operación denegada. Su cuenta carece de la capacidad requerida: {required_cap}"
                )
            return payload
        return _verifier