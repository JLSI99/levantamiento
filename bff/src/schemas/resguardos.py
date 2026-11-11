from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
import re

# SCHEMAS DE USO COMÚN / INTERNO
class BienResguardoOut(BaseModel):
    numero_inventario: Optional[str] = None
    descripcion: str
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serie: Optional[str] = None

class UbicacionResguardoOut(BaseModel):
    aula: str
    edificio: str
    departamento: str

class PersonaResguardoOut(BaseModel):
    curp: str
    nombres: str
    apellidos: str

# VISTA: RESGUARDANTE
class MisResguardosOut(BaseModel):
    id_asignacion: UUID
    fecha_inicio: date
    dias_vigencia: int
    bien: BienResguardoOut
    ubicacion: UbicacionResguardoOut

class MisResguardosPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[MisResguardosOut]

# VISTA: LEVANTADOR / ADMINISTRADOR
class ResguardoCreateBFF(BaseModel):
    numero_inventario: str
    curp: str = Field(..., min_length=18, max_length=18)
    id_aula: UUID
    id_edificio: UUID
    id_departamento: UUID

    @field_validator("curp")
    @classmethod
    def validar_curp_entrada(cls, v: str) -> str:
        v = v.upper().strip()
        pattern = r"^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$"
        if not re.match(pattern, v):
            raise ValueError("El formato del CURP es inválido ante los estándares de RENAPO.")
        return v

class ResguardoUpdateBFF(BaseModel):
    numero_inventario: Optional[str] = None
    curp: Optional[str] = None
    id_aula: Optional[UUID] = None
    id_edificio: Optional[UUID] = None
    id_departamento: Optional[UUID] = None

class ResguardoAdminOutBFF(BaseModel):
    id_asignacion: UUID
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    esta_activo: bool
    dias_vigencia: int
    persona: PersonaResguardoOut
    bien: BienResguardoOut
    ubicacion: UbicacionResguardoOut

class ResguardoAdminPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[ResguardoAdminOutBFF]

# SCHEMAS: SOLICITUDES DE RESGUARDO (BFF)
class SolicitudResguardoCreateBFF(BaseModel):
    bien_solicitado: str = Field(..., min_length=2, max_length=150)
    id_aula: UUID
    id_edificio: UUID
    id_departamento: UUID
    justificacion: Optional[str] = None

class SolicitudResguardoAprobarBFF(BaseModel):
    numero_inventario: str = Field(..., min_length=1, max_length=50)

class SolicitudResguardoRechazarBFF(BaseModel):
    comentario_resolucion: str = Field(..., min_length=3, max_length=255)

class SolicitudResguardoOutBFF(BaseModel):
    id_solicitud: UUID
    bien_solicitado: str
    fecha_solicitud: datetime
    estado: str
    justificacion: Optional[str] = None
    fecha_resolucion: Optional[datetime] = None
    comentario_resolucion: Optional[str] = None
    solicitante: PersonaResguardoOut
    resolutor: Optional[PersonaResguardoOut] = None
    ubicacion: UbicacionResguardoOut

class SolicitudResguardoPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[SolicitudResguardoOutBFF]