import os
from datetime import datetime, timedelta, timezone
from typing import Any, Union, List, Optional
from jose import jwt, JWTError

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 360))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 1))
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "itsc-auth-service")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "itsc-ecosistema-universitario")

if not SECRET_KEY:
    raise ValueError("SECRET_KEY no está configurada")

def create_access_token(id_usuario: Union[str, Any], username: str, email: str, roles: List[str]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "sub": str(id_usuario),
        "iss": JWT_ISSUER,  
        "aud": JWT_AUDIENCE,
        "username": username,
        "email": email,
        "roles": roles,      
        "type": "access"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(id_usuario: Union[str, Any]) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "exp": expire,
        "sub": str(id_usuario),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "type": "refresh"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], issuer=JWT_ISSUER, audience=JWT_AUDIENCE)
    except JWTError:
        return None