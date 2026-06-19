from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import date

class TipoBienOutBFF(BaseModel):
    id_tipo: UUID
    nombre: str = Field(..., description="Nombre de la categoría del bien")
    tasa_depreciacion_anual: Decimal = Field(..., ge=Decimal("0.00"), le=Decimal("100.00"))
    esta_activo: bool = Field(..., description="Estado lógico del registro")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True
    }

class TipoBienPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[TipoBienOutBFF]

class TipoBienCreateBFF(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)
    tasa_depreciacion_anual: Decimal = Field(Decimal("0.00"), ge=Decimal("0.00"), le=Decimal("100.00"))

    @field_validator('nombre')
    @classmethod
    def limpiar_nombre(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('El nombre del tipo de bien no puede estar vacío.')
        return v

class TipoBienUpdateBFF(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    tasa_depreciacion_anual: Optional[Decimal] = Field(None, ge=Decimal("0.00"), le=Decimal("100.00"))

    @field_validator('nombre')
    @classmethod
    def verificar_nombre(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('La actualización del nombre no puede ser una cadena vacía.')
        return v

class BienOutBFF(BaseModel):
    id_bien: UUID
    serie: Optional[str] = None
    modelo: Optional[str] = None
    marca: Optional[str] = None
    descripcion: str
    costo: Decimal
    fecha_adquisicion: Optional[date] = None
    esta_activo: bool
    meses_uso: int = Field(..., description="Cálculo dinámico provisto por el microservicio")
    tipos: List[TipoBienOutBFF] = []

    model_config = {
        "from_attributes": True
    }

class BienPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[BienOutBFF]

class BienCreateBFF(BaseModel):
    serie: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=100)
    marca: Optional[str] = Field(None, max_length=100)
    descripcion: str = Field(..., min_length=3, max_length=255)
    costo: Decimal = Field(..., gt=Decimal("0.00"))
    fecha_adquisicion: Optional[date] = None
    tipos_ids: List[UUID] = Field(..., min_length=1, description="Asociación obligatoria M2M")

    @field_validator('descripcion')
    @classmethod
    def limpiar_descripcion(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError('La descripción debe contener al menos 3 caracteres reales.')
        return v

class BienUpdateBFF(BaseModel):
    serie: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=100)
    marca: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, min_length=3, max_length=255)
    costo: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    fecha_adquisicion: Optional[date] = None
    tipos_ids: Optional[List[UUID]] = None