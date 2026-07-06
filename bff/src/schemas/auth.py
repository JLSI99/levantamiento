from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional

class UserLoginBFF(BaseModel):
    identifier: str = Field(
        ..., 
        min_length=3,
        max_length=100,
        description="Acepta indistintamente el username o el email institucional del usuario"
    )
    password: str = Field(..., min_length=8, description="Contraseña en texto plano")

class TokenBFF(BaseModel):
    access_token: str = Field(..., description="JWT Access Token firmado con capacidades CapBAC")
    refresh_token: str = Field(..., description="JWT Refresh Token para extensión de sesión")
    token_type: str = Field("bearer", description="Esquema de autenticación estandarizado")

class TokenRefreshBFF(BaseModel):
    refresh_token: str = Field(..., description="Refresh Token criptográfico vigente")

class UserDataSession(BaseModel):
    id_usuario: str = Field(..., description="UUID del usuario mapeado desde el claim 'sub'")
    username: str = Field(..., description="Username extraído de los claims")
    email: Optional[EmailStr] = Field(None, description="Email institucional validado")

class UserSessionContextOut(BaseModel):
    usuario: UserDataSession
    roles: List[str] = Field(default_factory=list, description="Roles asignados al rol relacional")
    capabilities: List[str] = Field(default_factory=list, description="Set plano de capacidades CapBAC permitidas")