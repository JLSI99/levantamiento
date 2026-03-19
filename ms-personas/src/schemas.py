from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from typing import Optional, List
import re

class PersonaBase(BaseModel):
    nombres: str = Field(..., min_length=2, max_length=100)
    apellidos: str = Field(..., min_length=2, max_length=100)
    curp: str = Field(..., min_length=18, max_length=18, description="CURP de 18 caracteres alfanuméricos")

    @field_validator('nombres','apellidos')
    @classmethod
    def limpiar_y_validar_nombres(cls,  v: str)->str:
        v=v.strip()
        if not re.match(r"^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$", v):
            raise ValueError('Los nombre y apellidos solo pueden contener letras')
        return v
    
    @field_validator('curp')
    @classmethod
    def validar_formato_curp(cls, v: str) -> str:
        v = v.upper()
        patron = r'^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$'
        if not re.match(patron, v):
            raise ValueError('El formato del CURP no es válido')
        return v

class PersonaCreate(PersonaBase):
    pass

class PersonaOut(PersonaBase):
    id_persona: UUID
    
    class Config:
        from_attributes = True

class CheckAccessRequest(BaseModel):
    roles: List[str]
    path: str
    metodo: str

class CheckAccessResponse(BaseModel):
    permitido: bool

class PersonaPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PersonaOut]