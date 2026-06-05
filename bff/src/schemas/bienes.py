from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import date

class TipoBienOutBFF(BaseModel):
    id_tipo: UUID
    nombre: str
    tasa_depreciacion_anual: Decimal
    esta_activo: bool

    model_config = {"populate_by_name": True}

class TipoBienPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[TipoBienOutBFF]

class BienOutBFF(BaseModel):
    id_bien: UUID
    serie: Optional[str]
    modelo: Optional[str]
    marca: Optional[str]
    descripcion: str
    costo: Decimal
    fecha_adquisicion: Optional[date]
    esta_activo: bool
    meses_uso: int
    tipos: List[TipoBienOutBFF] = []

class BienPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[BienOutBFF]
# ==============================================================================
# SCHEMAS DE ENTRADA (INPUT) - PARA EL REGISTRADOR
# ==============================================================================
class TipoBienCreateBFF(BaseModel):
    nombre: str
    tasa_depreciacion_anual: Decimal

class TipoBienUpdateBFF(BaseModel):
    nombre: Optional[str] = None
    tasa_depreciacion_anual: Optional[Decimal] = None

class BienCreateBFF(BaseModel):
    serie: Optional[str] = None
    modelo: Optional[str] = None
    marca: Optional[str] = None
    descripcion: str
    costo: Decimal
    fecha_adquisicion: Optional[date] = None
    tipos_ids: List[UUID]

class BienUpdateBFF(BaseModel):
    serie: Optional[str] = None
    modelo: Optional[str] = None
    marca: Optional[str] = None
    descripcion: Optional[str] = None
    costo: Optional[Decimal] = None
    fecha_adquisicion: Optional[date] = None
    tipos_ids: Optional[List[UUID]] = None