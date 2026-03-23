from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from uuid import UUID

class AulaBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)

    @field_validator('nombre')
    @classmethod
    def limpiar_espacios(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('El campo no puede estar vacío')
        return v

class AulaCreate(AulaBase):
    pass

class AulaOut(AulaBase):
    id_aula: UUID
    id_edificio: UUID
    model_config = {"from_attributes": True}

class EdificioBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    clave: Optional[str] = Field(None, max_length=20)

    @field_validator('nombre', 'clave')
    @classmethod
    def limpiar_espacios(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v and cls.model_fields[cls.__fields_set__].is_required():
                raise ValueError('El campo no puede estar vacío')
        return v

class EdificioCreate(EdificioBase):
    pass

class EdificioOut(EdificioBase):
    id_edificio: UUID
    aulas: List[AulaOut] = []
    model_config = {"from_attributes": True}

class DepartamentoBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    id_jefe_departamento: Optional[UUID] = None

    @field_validator('nombre')
    @classmethod
    def limpiar_espacios(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('El campo no puede estar vacío')
        return v

class DepartamentoCreate(DepartamentoBase):
    pass

class DepartamentoOut(DepartamentoBase):
    id_departamento: UUID
    model_config = {"from_attributes": True}

class EdificioPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[EdificioOut]

class DepartamentoPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[DepartamentoOut]