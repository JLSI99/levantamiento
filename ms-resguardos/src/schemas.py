from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import date
import re

class AsignacionBase(BaseModel):
    id_bien: UUID = Field(..., description="Identificador único del activo fijo externo")
    curp: str = Field(..., description="CURP de 18 caracteres del resguardatario responsable",min_length=18,max_length=18)
    id_aula: UUID = Field(..., description="Identificador de la ubicación física exacta")
    id_edificio: UUID = Field(..., description="Identificador de la estructura edilicia")
    id_departamento: UUID = Field(..., description="Unidad administrativa responsable")

    @field_validator("curp")
    @classmethod
    def validar_formato_curp(cls, v: str) -> str:
        v = v.upper().strip()
        # Expresión regular estándar para la estructura del CURP en México
        pattern = r"^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$"
        if not re.match(pattern, v):
            raise ValueError("El formato del CURP es inválido.")
        return v

class AsignacionCreate(AsignacionBase):
    pass

class AsignacionUpdate(BaseModel):
    id_bien: Optional[UUID] = None
    curp: Optional[str] = None
    id_aula: Optional[UUID] = None
    id_edificio: Optional[UUID] = None
    id_departamento: Optional[UUID] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None

    @field_validator("curp")
    @classmethod
    def validar_formato_curp_opcional(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.upper().strip()
        pattern = r"^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$"
        if not re.match(pattern, v):
            raise ValueError("El formato del CURP es inválido.")
        return v

class AsignacionOut(AsignacionBase):
    id_asignacion: UUID
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    esta_activo: bool
    dias_vigencia: int
    
    model_config = ConfigDict(from_attributes=True)

class AsignacionPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[AsignacionOut]