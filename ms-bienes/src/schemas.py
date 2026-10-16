from pydantic import BaseModel, Field, field_validator, computed_field
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime
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

class ImagenBienOut(BaseModel):
    id_imagen: UUID
    id_bien: UUID
    path_archivo: str
    nombre_original: str
    mime_type: str
    tamano_bytes: int
    orden: int
    fecha_creacion: datetime

    @computed_field
    @property
    def url(self) -> str:
        return f"/media/{self.path_archivo}"

    model_config = {
        "from_attributes": True
    }

class BienBase(BaseModel):
    numero_inventario: str = Field(..., min_length=1, max_length=50, description="Número de inventario institucional único")
    serie: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=100)
    marca: Optional[str] = Field(None, max_length=100)
    descripcion: str = Field(..., min_length=3, max_length=255)
    costo: Decimal = Field(..., gt=Decimal("0.00"), description="El valor base debe ser strictly positivo")
    fecha_adquisicion: Optional[date] = None

    @field_validator('numero_inventario', 'descripcion')
    @classmethod
    def validar_campos_obligatorios(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Este campo obligatorio no puede estar vacío.')
        return v

    @field_validator('serie', 'modelo', 'marca')
    @classmethod
    def sanitizar_campos_opcionales(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            return v if v != "" else None
        return v

class BienCreate(BienBase):
    tipos_ids: List[UUID] = Field(..., min_length=1, description="Se requiere al menos un tipo de bien asignado")

class BienUpdate(BaseModel):
    numero_inventario: Optional[str] = Field(None, min_length=1, max_length=50)
    serie: Optional[str] = Field(None, max_length=50)
    modelo: Optional[str] = Field(None, max_length=100)
    marca: Optional[str] = Field(None, max_length=100)
    descripcion: Optional[str] = Field(None, min_length=3, max_length=255)
    costo: Optional[Decimal] = Field(None, gt=Decimal("0.00"))
    fecha_adquisicion: Optional[date] = None
    tipos_ids: Optional[List[UUID]] = None 

    @field_validator('numero_inventario', 'descripcion')
    @classmethod
    def limpiar_obligatorios(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError('El campo enviado no puede contener únicamente espacios en blanco.')
        return v

    @field_validator('serie', 'modelo', 'marca')
    @classmethod
    def sanitizar_opcionales_update(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v = v.strip()
            return v if v else None
        return None

class BienOut(BienBase):
    id_bien: UUID
    esta_activo: bool
    meses_uso: int 
    tipos: List[TipoBienOut] = []
    imagenes: List[ImagenBienOut] = []
    
    model_config = {
        "from_attributes": True
    }

class BienPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[BienOut]