from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from uuid import UUID
from datetime import date
import re
# ==============================================================================
# SCHEMAS DE USO COMÚN / INTERNO
# ==============================================================================
class BienResguardoOut(BaseModel):
    id_bien: UUID
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
# ==============================================================================
# VISTA: RESGUARDANTE (FLUJO ORIGINAL CLIENTE)
# ==============================================================================
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
# ==============================================================================
# VISTA: LEVANTADOR / ADMINISTRADOR (GESTIÓN DE TERCEROS)
# ==============================================================================
class ResguardoCreateBFF(BaseModel):
    id_bien: UUID
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
    id_bien: Optional[UUID] = None
    curp: Optional[str] = None
    id_aula: Optional[UUID] = None
    id_edificio: Optional[UUID] = None
    id_departamento: Optional[UUID] = None

    @field_validator("curp")
    @classmethod
    def validar_curp_opcional(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.upper().strip()
        pattern = r"^[A-Z]{4}\d{6}[HM][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$"
        if not re.match(pattern, v):
            raise ValueError("El formato del CURP es inválido.")
        return v

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