from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date

class TipoBienBase(BaseModel):
    nombre: str
    tasa_depreciacion_anual: float

class TipoBienCreate(TipoBienBase):
    pass

class TipoBienOut(TipoBienBase):
    id_tipo: UUID

    class Config:
        orm_mode = True

class BienBase(BaseModel):
    serie: Optional[str] = None
    modelo: Optional[str] = None
    marca: Optional[str] = None
    descripcion: str
    costo: float
    fecha_adquisicion: Optional[date] = None

class BienCreate(BienBase):
    tipos_ids: List[UUID]

class BienOut(BienBase):
    id_bien: UUID
    esta_activo: bool
    tipos: List[TipoBienOut]

    class Config:
        orm_mode = True
