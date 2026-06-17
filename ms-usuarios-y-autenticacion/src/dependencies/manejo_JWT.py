import os
import time
from typing import Any, List, Optional
from jose import jwt, JWTError

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 360))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 1))
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "itsc-auth-service")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "itsc-ecosistema-universitario")

if not SECRET_KEY:
    raise ValueError("CRÍTICO: SECRET_KEY no configurada en las variables de entorno.")

def create_access_token(id_usuario: Any, username: str, email: str, roles: List[str], caps: List[str], curp: str) -> str:
    ahora = int(time.time())
    expire = ahora + (ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    
    to_encode = {
        "exp": expire,
        "iat": ahora,
        "nbf": ahora,
        "sub": str(id_usuario),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "username": username,
        "email": email,
        "roles": roles,
        "caps": caps,
        "curp": curp,
        "type": "access"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(id_usuario: Any) -> str:
    ahora = int(time.time())
    expire = ahora + (REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60)
    
    to_encode = {
        "exp": expire,
        "iat": ahora,
        "nbf": ahora,
        "sub": str(id_usuario),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "type": "refresh"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str, expected_type: str = "access") -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM], 
            issuer=JWT_ISSUER, 
            audience=JWT_AUDIENCE,
            options={"require_exp": True, "require_iat": True}
        )
        if payload.get("type") != expected_type:
            return None
        return payload
    except JWTError:
        return None