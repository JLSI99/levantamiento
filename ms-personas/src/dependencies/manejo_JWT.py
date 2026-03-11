import os
from datetime import datetime, timedelta, timezone
from typing import Any, Union, List, Optional
from jose import jwt, JWTError
from passlib.context import CryptContext

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 360))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 1))
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

if not SECRET_KEY:
    raise ValueError("SECRET_KEY no está configurada")

def create_access_token(
    id_usuario: Union[str, Any], 
    username: str,
    email: str,
    roles: List[str]
) -> str:

    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {
        "exp": expire,
        "sub": str(id_usuario),
        "username": username,
        "email": email,
        "roles": roles,      
        "type": "access"
    }
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(id_usuario: Union[str, Any]) -> str:
    """Genera un token de larga duración."""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "exp": expire,
        "sub": str(id_usuario),
        "type": "refresh"
    }
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> Optional[dict]:
    """Decodifica y valida la integridad del token."""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None