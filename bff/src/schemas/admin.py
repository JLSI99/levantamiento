from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from typing import Optional, List

# --- Esquemas de Personas ---
class PersonaCreateBFF(BaseModel):
    nombres: str = Field(..., min_length=1, description="Nombres de la persona")
    apellidos: str = Field(..., min_length=1, description="Apellidos de la persona")
    curp: str = Field(..., min_length=18, max_length=18, pattern=r"^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-String\d]\d$")

class PersonaUpdateBFF(BaseModel):
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    curp: Optional[str] = Field(None, min_length=18, max_length=18)

class PersonaOutBFF(BaseModel):
    id_persona: UUID
    nombres: str
    apellidos: str
    curp: str
    is_active: bool

class PersonaPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PersonaOutBFF]

# --- Esquemas de Usuarios ---
class RolOutBFF(BaseModel):
    id_rol: int
    nombre_rol: str
    descripcion: Optional[str]

class UserOutBFF(BaseModel):
    id_usuario: UUID
    curp: str
    username: str
    email: EmailStr
    is_active: bool
    roles: List[RolOutBFF]

class UserRegisterRequestBFF(BaseModel):
    curp: str = Field(..., min_length=18, max_length=18)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role_ids: List[int] = Field(default_factory=lambda: [2])

# --- NUEVO: Esquema Compuesto Atómico ---
class AltaPersonalCompuestaRequestBFF(BaseModel):
    persona: PersonaCreateBFF
    usuario: UserRegisterRequestBFF

class AltaPersonalCompuestaOutBFF(BaseModel):
    persona: PersonaOutBFF
    usuario: UserOutBFF

class UserUpdateBFF(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None

class UserRoleUpdateBFF(BaseModel):
    role_ids: List[int]

class UserPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[UserOutBFF]

class RolCreateBFF(BaseModel):
    nombre_rol: str
    descripcion: Optional[str] = None

class PermisoOutBFF(BaseModel):
    id_permiso: int
    nombre: str
    descripcion: Optional[str]

class RolPermisosUpdateBFF(BaseModel):
    permisos_ids: List[int]