from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import date
from decimal import Decimal

class TipoBienBase(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100, description="Denominación de la categoría")
    tasa_depreciacion_anual: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"), le=Decimal("100.00"))

    @field_validator('nombre')
    @classmethod
    def limpiar_espacios_nombre(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('El campo nombre no puede consistir únicamente en espacios vacíos.')
        return v

class TipoBienCreate(TipoBienBase):
    pass

class TipoBienUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    tasa_depreciacion_anual: Optional[Decimal] = Field(None, ge=Decimal("0.00"), le=Decimal("100.00"))

    @field_validator('nombre')
    @classmethod
    def limpiar_espacios_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('El campo modificado no puede ser una cadena vacía.')
        return v

class TipoBienOut(TipoBienBase):
    id_tipo: UUID
    esta_activo: bool = Field(..., description="Estado de activación lógica")

    model_config = {
        "from_attributes": True
    }

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
    costo: Decimal = Field(..., gt=Decimal("0.00"), description="El valor base debe ser estrictamente positivo")
    fecha_adquisicion: Optional[date] = None

    @field_validator('descripcion')
    @classmethod
    def validar_descripcion_obligatoria(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('La descripción estructural es un campo obligatorio para el negocio de activos.')
        return v

    @field_validator('serie', 'modelo', 'marca')
    @classmethod
    def sanitizar_campos_opcionales(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            return v if v != "" else None
        return v

class BienCreate(BienBase):
    tipos_ids: List[UUID] = Field(..., min_length=1, description="Se requiere al menos un sub-dominio de asignación")

class BienUpdate(BaseModel):
    serie: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=100)
    marca: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, min_length=3, max_length=255)
    costo: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    fecha_adquisicion: Optional[date] = None
    tipos_ids: Optional[List[UUID]] = None 

    @field_validator('serie', 'modelo', 'marca', 'descripcion')
    @classmethod
    def limpiar_espacios_parciales(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('El campo enviado no puede contener únicamente espacios en blanco.')
        return v

class BienOut(BienBase):
    id_bien: UUID
    esta_activo: bool
    meses_uso: int 
    tipos: List[TipoBienOut] = []
    
    model_config = {
        "from_attributes": True
    }

class BienPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[BienOut]