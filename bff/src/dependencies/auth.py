import os
from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
JWT_ISSUER = os.getenv("JWT_ISSUER", "itsc-auth-service")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "itsc-ecosistema-universitario")

if not SECRET_KEY:
    if os.getenv("ENV") == "production":
        raise ValueError("CRÍTICO: SECRET_KEY no definida en entorno de producción.")
    SECRET_KEY = "tu_clave_secreta_super_segura_institucional_2026"

bearer_scheme = HTTPBearer()

async def obtener_token_valido(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE
        )
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tipo de token no válido para esta operación."
            )

        payload["encoded_token"] = token
        return payload
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido, alterado o expirado."
        )

class RequireCapabilityBFF:
    def __init__(self, capacidad_requerida: str):
        self.capacidad_requerida = capacidad_requerida

    def __call__(self, payload: dict = Depends(obtener_token_valido)) -> dict:
        usuario_caps: List[str] = payload.get("caps", [])
        if self.capacidad_requerida not in usuario_caps:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permisos insuficientes. Requiere la capacidad: {self.capacidad_requerida}"
            )
        return payload