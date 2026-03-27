import re
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

class PermisoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=3, max_length=150)
    path_endpoint: Optional[str] = Field(None, min_length=1, max_length=255)
    metodo_http: Optional[str] = None
    descripcion: Optional[str] = Field(None, max_length=255)

    @field_validator("metodo_http")
    @classmethod
    def validar_metodo_http(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
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

class RolCreate(BaseModel):
    nombre_rol: str = Field(..., max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)

class RolUpdate(BaseModel):
    nombre_rol: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)

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
        ..., min_length=18, max_length=18, description="Foreign key lógica hacia ms-personas"
    )
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role_ids: List[int] = Field(default_factory=lambda: [2])

    @field_validator("username")
    @classmethod
    def validar_username(cls, v: str)->str:
        if not re.match(r"^\w+$",v):
            raise ValueError("El username solo puede contener letras números y guiones bajos")
        return v.lower()
    
    @field_validator("password")
    @classmethod
    def validar_password_fuerte(cls,v:str)->str:
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe tener al menos una mayúscula")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe tener al menos una minúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe tener al menos un número")
        return v

class UserLogin(BaseModel):
    identifier: str = Field(..., description="username o email")
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefresh(BaseModel):
    refresh_token: str = Field(..., description="El refresh token válido para obtener un nuevo access token")

class TokenPayload(BaseModel):
    sub: str
    exp: datetime
    roles: List[str] = Field(default_factory=list)

class CheckAccessRequest(BaseModel):
    roles: List[str]
    path: str
    metodo: str

class CheckAccessResponse(BaseModel):
    permitido: bool

class UserPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[UserOut]

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None

    @field_validator("username")
    @classmethod
    def validar_username(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^\w+$", v):
            raise ValueError("El username solo puede contener letras números y guiones bajos")
        return v.lower()
    
    @field_validator("password")
    @classmethod
    def validar_password_fuerte(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe tener al menos una mayúscula")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe tener al menos una minúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe tener al menos un número")
        return v

class UserRoleUpdate(BaseModel):
    role_ids: List[int] = Field(..., description="Lista de IDs de los nuevos roles a asignar")

class RolPermisosUpdate(BaseModel):
    permisos_ids: List[int] = Field(..., description="Lista de IDs de permisos a asignar al rol")