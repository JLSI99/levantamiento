import os
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
from jose import jwt, JWTError

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 360))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 1))
SECRET_KEY = os.getenv("SECRET_KEY", "tu_clave_secreta_super_segura_institucional_2026")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "itsc-auth-service")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "itsc-ecosistema-universitario")

def create_access_token(id_usuario: Any, username: str, email: str, roles: List[str], caps: List[str]) -> str:

    ahora = datetime.now(timezone.utc)
    expire = ahora + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "exp": expire,
        "iat": ahora,
        "sub": str(id_usuario),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "username": username,
        "email": email,
        "roles": roles,
        "caps": caps,
        "type": "access"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(id_usuario: Any) -> str:

    ahora = datetime.now(timezone.utc)
    expire = ahora + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "exp": expire,
        "iat": ahora,
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
            audience=JWT_AUDIENCE
        )
        if payload.get("type") != expected_type:
            return None
            
        return payload
    except JWTError:
        return None