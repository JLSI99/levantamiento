import os
from typing import Optional
from jose import jwt, JWTError

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "itsc-auth-service")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "itsc-ecosistema-universitario")

if not SECRET_KEY:
    raise ValueError("SECRET_KEY no está configurada en la plantilla")

def decode_token(token: str) -> Optional[dict]:

    try:
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE
        )
        return payload
    except JWTError:
        return None