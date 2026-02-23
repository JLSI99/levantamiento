from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional, List
from datetime import datetime


class PermisoOut(BaseModel):
    id_permiso: int
    nombre: str
    path_endpoint: str
    metodo_http: str

    class Config:
        from_attributes = True


class RolOut(BaseModel):
    id_rol: int
    nombre_rol: str
    descripcion: Optional[str]

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id_usuario: UUID
    curp: str
    username: str
    email: EmailStr
    is_active: bool
    roles: List[RolOut] = []

    class Config:
        from_attributes = True


class UserRegisterRequest(BaseModel):
    """Registro de usuario (Persona vive en ms-personas)"""
    curp: str = Field(..., min_length=18, max_length=18)
    username: str
    email: EmailStr
    password: str = Field(..., min_length=8)
    role_ids: List[int] = [2]


class UserLogin(BaseModel):
    identifier: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    exp: datetime
    roles: List[str]