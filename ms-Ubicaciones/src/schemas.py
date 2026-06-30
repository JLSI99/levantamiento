from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from uuid import UUID

class AulaBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)

    @field_validator('nombre')
    @classmethod
    def limpiar_espacios_nombre(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('El nombre del aula no puede consistir únicamente en espacios en blanco')
        return v

class AulaCreate(AulaBase):
    id_edificio: UUID

class AulaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)

    @field_validator('nombre')
    @classmethod
    def limpiar_espacios_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('El nombre del aula no puede estar vacío si se proporciona')
        return v

class AulaOut(AulaBase):
    id_aula: UUID
    id_edificio: UUID
    is_active: bool
    model_config = {"from_attributes": True}

class EdificioBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    clave: Optional[str] = Field(None, max_length=20)

    @field_validator('nombre')
    @classmethod
    def validar_nombre_edificio(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('El nombre del edificio es un campo obligatorio de negocio')
        return v

    @field_validator('clave')
    @classmethod
    def validar_clave_edificio(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip().upper()
            if not v:
                return None
        return v

class EdificioCreate(EdificioBase):
    pass

class EdificioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    clave: Optional[str] = Field(None, max_length=20)

    @field_validator('nombre', 'clave')
    @classmethod
    def limpiar_espacios_modificacion(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip()
        return v

class EdificioOut(EdificioBase):
    id_edificio: UUID
    is_active: bool
    aulas: List[AulaOut] = []
    model_config = {"from_attributes": True}

class EdificioPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[EdificioOut]

class DepartamentoBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    curp_jefe_departamento: str = Field(..., description="CURP de 18 caracteres del resguardatario responsable",min_length=18,max_length=18)

    @field_validator('nombre')
    @classmethod
    def limpiar_departamento(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('El nombre del departamento es requerido y obligatorio')
        return v

class DepartamentoCreate(DepartamentoBase):
    pass

class DepartamentoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    curp_jefe_departamento: str = Field(..., description="CURP de 18 caracteres del resguardatario responsable",min_length=18,max_length=18)


    @field_validator('nombre')
    @classmethod
    def limpiar_espacios_dept(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('El nombre del departamento no puede ser una cadena vacía')
        return v

class DepartamentoOut(DepartamentoBase):
    id_departamento: UUID
    is_active: bool
    model_config = {"from_attributes": True}

class DepartamentoPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[DepartamentoOut]