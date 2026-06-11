import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from uuid import UUID
from typing import Optional, List
from datetime import datetime
# ------------------------------------------------------------------------------
# 1. SUBSISTEMA DE CAPACIDADES Y PERMISOS (CBAC)
# ------------------------------------------------------------------------------
class PermisoOut(BaseModel):
    id_permiso: int
    nombre: str
    descripcion: Optional[str]

    model_config = {"from_attributes": True}

class PermisoCreate(BaseModel):
    nombre: str = Field(..., min_length=3, max_length=150, description="Ejemplo: 'bienes:crear'")
    descripcion: Optional[str] = Field(None, max_length=255)

class PermisoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=3, max_length=150)
    descripcion: Optional[str] = Field(None, max_length=255)
# ------------------------------------------------------------------------------
# 2. SUBSISTEMA DE ROLES
# ------------------------------------------------------------------------------
class RolOut(BaseModel):
    id_rol: int
    nombre_rol: str
    descripcion: Optional[str]

    model_config = {"from_attributes": True}

class RolCreate(BaseModel):
    nombre_rol: str = Field(..., max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)

class RolUpdate(BaseModel):
    nombre_rol: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)

class RolPermisosUpdate(BaseModel):
    permisos_ids: List[int] = Field(..., description="Sobrescribe el mapa de capacidades asignadas al rol")
# ------------------------------------------------------------------------------
# 3. SUBSISTEMA DE USUARIOS e IDENTIDADES
# ------------------------------------------------------------------------------
class UserOut(BaseModel):
    id_usuario: UUID
    curp: str
    username: str
    email: EmailStr
    is_active: bool
    roles: List[RolOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}

class UserRegisterRequest(BaseModel):
    curp: str = Field(..., min_length=18, max_length=18, description="Lazo lógico con ms-personas")
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role_ids: List[int] = Field(default_factory=lambda: [2])  # Rol 'Levantador' por defecto

    @field_validator("username")
    @classmethod
    def validar_username(cls, v: str) -> str:
        if not re.match(r"^\w+$", v):
            raise ValueError("El username solo puede contener letras, números y guiones bajos.")
        return v.lower()
    
    @field_validator("password")
    @classmethod
    def validar_password_fuerte(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula.")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un dígito numérico.")
        return v

class UserLogin(BaseModel):
    identifier: str = Field(..., description="Acepta indistintamente username o email institucional")
    password: str

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
            raise ValueError("El username solo puede contener letras, números y guiones bajos.")
        return v.lower()
    
    @field_validator("password")
    @classmethod
    def validar_password_fuerte(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula.")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un dígito numérico.")
        return v

class UserRoleUpdate(BaseModel):
    role_ids: List[int] = Field(..., description="Sobrescribe la matriz relacional de roles del usuario")

class UserPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[UserOut]

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefresh(BaseModel):
    refresh_token: str = Field(..., description="Refresh Token criptográfico emitido por el backend")

class TokenPayload(BaseModel):
    sub: str
    exp: datetime
    roles: List[str] = Field(default_factory=list)
    caps: List[str] = Field(default_factory=list)

class UserPayload(BaseModel):
    id: str
    username: str
    email: str
    role: str
    capabilities: List[str]

class TokenResponseFull(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPayload

class CheckAccessRequest(BaseModel):
    roles: List[str] = Field(..., description="Lista de roles del usuario extraídos del JWT claims")
    path: str = Field(..., description="Path relativo consultado de la API (ej: '/auth/login')")
    metodo: str = Field(..., description="Método HTTP de la petición (GET, POST, etc.)")

class CheckAccessResponse(BaseModel):
    permitido: bool