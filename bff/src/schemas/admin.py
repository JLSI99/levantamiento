import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from uuid import UUID
from typing import Optional, List

PATRON_CURP_COMPLIANT = r"(?i)^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$"
PATRON_NOMBRES_BFF = r"^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$"
# ------------------------------------------------------------------------------
# SUBSISTEMA DE PERSONAS (DATOS DEMOGRÁFICOS)
# ------------------------------------------------------------------------------
class PersonaCreateBFF(BaseModel):
    nombres: str = Field(..., min_length=2, max_length=100, description="Nombres de la persona")
    apellidos: str = Field(..., min_length=2, max_length=100, description="Apellidos de la persona")
    curp: str = Field(
        ..., 
        min_length=18, 
        max_length=18, 
        pattern=PATRON_CURP_COMPLIANT,
        description="CURP validada bajo estándar oficial de RENAPO"
    )

    @field_validator("nombres", "apellidos")
    @classmethod
    def limpiar_y_validar_nombres(cls, v: str) -> str:
        v = v.strip()
        if not re.match(PATRON_NOMBRES_BFF, v):
            raise ValueError("Los nombres y apellidos solo pueden contener letras, espacios y caracteres acentuados o diéresis.")
        return v

    @field_validator("curp")
    @classmethod
    def normalizar_curp(cls, v: str) -> str:
        return v.strip().upper()

class PersonaUpdateBFF(BaseModel):
    nombres: Optional[str] = Field(None, min_length=2, max_length=100)
    apellidos: Optional[str] = Field(None, min_length=2, max_length=100)
    curp: Optional[str] = Field(None, min_length=18, max_length=18, pattern=PATRON_CURP_COMPLIANT)

    @field_validator("nombres", "apellidos")
    @classmethod
    def limpiar_y_validar_nombres(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not re.match(PATRON_NOMBRES_BFF, v):
            raise ValueError("Los nombres y apellidos solo pueden contener letras, espacios y caracteres acentuados o diéresis.")
        return v

    @field_validator("curp")
    @classmethod
    def normalizar_curp(cls, v: Optional[str]) -> Optional[str]:
        return v.strip().upper() if v is not None else v

class PersonaOutBFF(BaseModel):
    id_persona: UUID
    nombres: str
    apellidos: str
    curp: str
    is_active: bool

    model_config = {"from_attributes": True}

class PersonaPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PersonaOutBFF]
# ------------------------------------------------------------------------------
# SUBSISTEMA DE USUARIOS E IDENTIDADES CRIPTOGRÁFICAS
# ------------------------------------------------------------------------------
class RolOutBFF(BaseModel):
    id_rol: int
    nombre_rol: str
    descripcion: Optional[str]

    model_config = {"from_attributes": True}

class UserOutBFF(BaseModel):
    id_usuario: UUID
    curp: str
    username: str
    email: EmailStr
    is_active: bool
    roles: List[RolOutBFF]

    model_config = {"from_attributes": True}

class UserRegisterRequestBFF(BaseModel):
    curp: str = Field(..., min_length=18, max_length=18, pattern=PATRON_CURP_COMPLIANT)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role_ids: List[int] = Field(default_factory=lambda: [2])

    @field_validator("curp")
    @classmethod
    def normalizar_curp(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("username")
    @classmethod
    def validar_username_bff(cls, v: str) -> str:
        if not re.match(r"^\w+$", v):
            raise ValueError("El username solo puede contener letras, números y guiones bajos.")
        return v.lower()
    
    @field_validator("password")
    @classmethod
    def validar_password_fuerte_bff(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula.")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un dígito numérico.")
        return v

class UserUpdateBFF(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None

    @field_validator("username")
    @classmethod
    def validar_username_bff(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^\w+$", v):
            raise ValueError("El username solo puede contener letras, números y guiones bajos.")
        return v.lower()
    
    @field_validator("password")
    @classmethod
    def validar_password_fuerte_bff(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula.")
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula.")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un dígito numérico.")
        return v

class UserRoleUpdateBFF(BaseModel):
    role_ids: List[int]

class UserPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[UserOutBFF]
# ------------------------------------------------------------------------------
# ESTRUCTURAS COMPUESTAS ATÓMICAS (ORQUESTACIÓN)
# ------------------------------------------------------------------------------
class AltaPersonalCompuestaRequestBFF(BaseModel):
    persona: PersonaCreateBFF
    usuario: UserRegisterRequestBFF

class AltaPersonalCompuestaOutBFF(BaseModel):
    persona: PersonaOutBFF
    usuario: UserOutBFF
# ------------------------------------------------------------------------------
# SUBSISTEMA DE CAPACIDADES Y ROLES GLOBALES
# ------------------------------------------------------------------------------
class RolCreateBFF(BaseModel):
    nombre_rol: str = Field(..., max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)

class PermisoOutBFF(BaseModel):
    id_permiso: int
    nombre: str
    descripcion: Optional[str]

    model_config = {"from_attributes": True}

class RolPermisosUpdateBFF(BaseModel):
    permisos_ids: List[int]