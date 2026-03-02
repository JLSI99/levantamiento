from pydantic import BaseModel, EmailStr, Field, field_validator
from uuid import UUID
from typing import Optional, List
from datetime import datetime

class PermisoCreate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=150)
    path_endpoint: str = Field(..., min_length=1, max_length=255)
    metodo_http: str = Field(
        ...,
        description="Método HTTP permitido"
    )
    descripcion: Optional[str] = Field(None, max_length=255)

    @field_validator("metodo_http")
    @classmethod
    def validar_metodo_http(cls, v: str) -> str:
        permitidos = {"GET", "POST", "PUT", "DELETE", "PATCH"}
        v = v.upper()
        if v not in permitidos:
            raise ValueError(f"Método HTTP inválido: {v}")
        return v


class PermisoOut(BaseModel):
    id_permiso: int
    nombre: str
    path_endpoint: str
    metodo_http: str
    descripcion: Optional[str]

    model_config = {
        "from_attributes": True
    }

class RolOut(BaseModel):
    id_rol: int
    nombre_rol: str
    descripcion: Optional[str]

    model_config = {
        "from_attributes": True
    }

class UserOut(BaseModel):
    id_usuario: UUID
    curp: str
    username: str
    email: EmailStr
    is_active: bool
    roles: List[RolOut] = Field(default_factory=list)

    model_config = {
        "from_attributes": True
    }


class UserRegisterRequest(BaseModel):
    curp: str = Field(
        ...,
        min_length=18,
        max_length=18,
        description="Foreign key lógica hacia ms-personas"
    )
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role_ids: List[int] = Field(default_factory=lambda: [2])


class UserLogin(BaseModel):
    identifier: str = Field(..., description="username o email")
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: str
    exp: datetime
    roles: List[str] = Field(default_factory=list)