from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

class ElementoCatalogoBFF(BaseModel):
    id_entidad: UUID = Field(..., description="ID único (id_edificio, id_aula o id_departamento)")
    nombre: str
    clave: Optional[str] = None

    class Config:
        from_attributes = True

class CatalogosUbicacionesOutBFF(BaseModel):
    edificios: List[ElementoCatalogoBFF]
    aulas: List[ElementoCatalogoBFF]
    departamentos: List[ElementoCatalogoBFF]
# ==============================================================================
# ESQUEMAS PARA DOMINIO: EDIFICIOS
# ==============================================================================
class EdificioCreateBFF(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    clave: str = Field(..., min_length=1, max_length=20)

class EdificioUpdateBFF(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    clave: Optional[str] = Field(None, min_length=1, max_length=20)

class AulaSubInEdificioOut(BaseModel):
    id_aula: UUID
    nombre: str
    is_active: bool

    class Config:
        from_attributes = True

class EdificioOutBFF(BaseModel):
    id_edificio: UUID
    nombre: str
    clave: str
    is_active: bool
    aulas: List[AulaSubInEdificioOut] = []

    class Config:
        from_attributes = True

class EdificioPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[EdificioOutBFF]
# ==============================================================================
# ESQUEMAS PARA DOMINIO: AULAS
# ==============================================================================
class AulaCreateBFF(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class AulaUpdateBFF(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)

class AulaOutBFF(BaseModel):
    id_aula: UUID
    id_edificio: UUID
    nombre: str
    is_active: bool

    class Config:
        from_attributes = True
# ==============================================================================
# ESQUEMAS PARA DOMINIO: DEPARTAMENTOS
# ==============================================================================
class DepartamentoCreateBFF(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    id_jefe_departamento: Optional[UUID] = None

class DepartamentoUpdateBFF(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    id_jefe_departamento: Optional[UUID] = None

class DepartamentoOutBFF(BaseModel):
    id_departamento: UUID
    nombre: str
    id_jefe_departamento: Optional[UUID] = None
    is_active: bool

    class Config:
        from_attributes = True

class DepartamentoPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[DepartamentoOutBFF]