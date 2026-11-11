from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
import re
from src.models import EstadoSolicitud

class AsignacionBase(BaseModel):
    numero_inventario: str = Field(..., min_length=1, max_length=50)
    curp: str = Field(..., min_length=18, max_length=18)
    id_aula: UUID
    id_edificio: UUID
    id_departamento: UUID

    @field_validator('curp')
    @classmethod
    def validar_curp_formato(cls, v: str) -> str:
        v = v.upper().strip()
        pattern = r"^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$"
        if not re.match(pattern, v):
            raise ValueError('El formato de CURP especificado no es válido.')
        return v

class AsignacionCreate(AsignacionBase):
    pass

class AsignacionUpdate(BaseModel):
    numero_inventario: Optional[str] = Field(None, min_length=1, max_length=50)
    curp: Optional[str] = Field(None, min_length=18, max_length=18)
    id_aula: Optional[UUID] = None
    id_edificio: Optional[UUID] = None
    id_departamento: Optional[UUID] = None

class AsignacionOut(AsignacionBase):
    id_asignacion: UUID
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    esta_activo: bool
    dias_vigencia: int

    model_config = {"from_attributes": True}

class AsignacionPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[AsignacionOut]


class SolicitudResguardoCreate(BaseModel):
    bien_solicitado: str = Field(..., min_length=2, max_length=150)
    id_aula: UUID
    id_edificio: UUID
    id_departamento: UUID
    justificacion: Optional[str] = Field(None, max_length=255)

class SolicitudResguardoAprobar(BaseModel):
    numero_inventario: str = Field(..., min_length=1, max_length=50)

class SolicitudResguardoRechazar(BaseModel):
    comentario_resolucion: str = Field(..., min_length=3, max_length=255)

class SolicitudResguardoOut(BaseModel):
    id_solicitud: UUID
    bien_solicitado: str
    curp_solicitante: str
    id_aula: UUID
    id_edificio: UUID
    id_departamento: UUID
    justificacion: Optional[str] = None
    estado: EstadoSolicitud
    fecha_solicitud: datetime
    fecha_resolucion: Optional[datetime] = None
    curp_resolutor: Optional[str] = None
    comentario_resolucion: Optional[str] = None

    model_config = {"from_attributes": True}

class SolicitudResguardoPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[SolicitudResguardoOut]