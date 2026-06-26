# bff/src/dependencies/auth.py
import os
from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError 
from jose.exceptions import JWTClaimsError
from pydantic import BaseModel, Field

# --------------------------------------------------------------------------
# CONFIGURACIÓN DE VARIABLES DE ENTORNO (PERÍMETRO DE SEGURIDAD)
# --------------------------------------------------------------------------
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "itsc-auth-service")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "itsc-ecosistema-universitario")

if not SECRET_KEY:
    raise ValueError("CRÍTICO: SECRET_KEY no configurada en las variables de entorno del BFF.")

bearer_scheme = HTTPBearer(auto_error=True)

# --------------------------------------------------------------------------
# ESQUEMAS DE DATOS ESTRUCTURADOS (PYDANTIC V2)
# --------------------------------------------------------------------------
class TokenPayload(BaseModel):
    sub: str = Field(..., description="Identificador único del usuario (UUID de la cuenta)")
    username: str = Field(..., description="Nombre de usuario único extraído del microservicio")
    email: Optional[str] = Field(None, description="Correo institucional del usuario")
    curp: Optional[str] = Field(None, description="Clave Única de Registro de Población (CURP) vinculada a la persona física")
    roles: List[str] = Field(default_factory=list, description="Lista de roles asignados al usuario")
    caps: List[str] = Field(default_factory=list, description="Lista explícita de capacidades CapBAC")
    type: str = Field(..., description="Tipo de token (debe ser 'access')")
    iss: str = Field(..., description="Emisor del token")
    aud: str = Field(..., description="Audiencia destino del token")
    exp: int = Field(..., description="Timestamp de expiración Unix")
    raw_token: str = Field(..., description="Cadena de texto original del JWT Bearer")

# --------------------------------------------------------------------------
# INTERCEPTOR Y VALIDADOR CRIPTOGRÁFICO DE TOKENS
# --------------------------------------------------------------------------
async def obtener_token_valido(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> TokenPayload:
    token = credentials.credentials
    
    try:
        # Descomprime y valida la firma criptográfica contra las invariantes del ecosistema
        payload_dict = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            options={"require_exp": True, "require_iss": True, "require_aud": True}
        )
        
        # Validar discriminador de tipo de token para mitigar ataques de confusión de token (ej. Refresh por Access)
        if payload_dict.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Acceso denegado. El token provisto no cumple con el tipo 'access' requerido."
            )
            
        # Preservar el string JWT original para delegación downstream si es requerida
        payload_dict["raw_token"] = token
        
        # La instanciación ahora mapea y valida de forma estricta la propiedad 'curp'
        return TokenPayload(**payload_dict)

    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="TOKEN_EXPIRED"
        )
    except JWTClaimsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Inconsistencia en los claims de seguridad del token: {str(e)}"
        )
    except (JWTError, Exception):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido, firma corrupta o estructura alterada ilegítimamente."
        )

# --------------------------------------------------------------------------
# CLASE DE CONTROL DE ACCESO BASADO EN CAPACIDADES (CapBAC)
# --------------------------------------------------------------------------
class RequireCapabilityBFF:
    def __init__(self, capacidad_requerida: str):
        self.capacidad_requerida = capacidad_requerida

    def __call__(self, token_data: TokenPayload = Depends(obtener_token_valido)) -> TokenPayload:
        if self.capacidad_requerida not in token_data.caps:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Operación denegada. Su cuenta no posee los privilegios de capacidad "
                    f"específicos necesarios para ejecutar esta acción: '{self.capacidad_requerida}'."
                )
            )
        return token_data