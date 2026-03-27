from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import date

class TipoBienBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre del tipo de bien")
    tasa_depreciacion_anual: float = Field(0.0, ge=0.0, le=100.0, description="Porcentaje de 0 a 100")

    @field_validator('nombre')
    @classmethod
    def limpiar_espacios(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('El campo no puede estar vacío o contener solo espacios')
        return v

class TipoBienCreate(TipoBienBase):
    pass

class TipoBienUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    tasa_depreciacion_anual: Optional[float] = Field(None, ge=0.0, le=100.0)

    @field_validator('nombre')
    @classmethod
    def limpiar_espacios(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('El campo no puede estar vacío')
        return v

class TipoBienOut(TipoBienBase):
    id_tipo: UUID
    esta_activo: bool 
    model_config = {"from_attributes": True}

class TipoBienPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[TipoBienOut]

class BienBase(BaseModel):
    serie: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=100)
    marca: Optional[str] = Field(None, max_length=100)
    descripcion: str = Field(..., min_length=3, max_length=255)
    costo: float = Field(..., gt=0.0, description="El costo debe ser mayor a 0")
    fecha_adquisicion: Optional[date] = None

    @field_validator('serie', 'modelo', 'marca', 'descripcion')
    @classmethod
    def limpiar_espacios(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v and cls.model_fields[cls.__fields_set__].is_required():
                raise ValueError('El campo no puede estar vacío')
        return v

class BienCreate(BienBase):
    tipos_ids: List[UUID]

class BienUpdate(BaseModel):
    serie: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=100)
    marca: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, min_length=3, max_length=255)
    costo: Optional[float] = Field(None, gt=0.0)
    fecha_adquisicion: Optional[date] = None
    tipos_ids: Optional[List[UUID]] = None 

    @field_validator('serie', 'modelo', 'marca', 'descripcion')
    @classmethod
    def limpiar_espacios(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('El campo no puede estar vacío si se envía')
        return v

class BienOut(BienBase):
    id_bien: UUID
    esta_activo: bool
    meses_uso: int 
    tipos: List[TipoBienOut]
    model_config = {"from_attributes": True}

class BienPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[BienOut]