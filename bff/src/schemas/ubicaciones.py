 from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

class ElementoCatalogoBFF(BaseModel):
    id_entidad: UUID = Field(..., description="ID único estructural (id_edificio, id_aula o id_departamento)")
    nombre: str = Field(..., description="Nombre legible de la entidad para visualización en Frontend")
    clave: Optional[str] = Field(None, description="Código institucional único, si aplica")

    model_config = {
        "from_attributes": True
    }

class CatalogosUbicacionesOutBFF(BaseModel):
    edificios: List[ElementoCatalogoBFF] = Field(..., description="Listado unificado de edificios activos")
    aulas: List[ElementoCatalogoBFF] = Field(..., description="Listado mapeado de aulas activas con contexto posicional")
    departamentos: List[ElementoCatalogoBFF] = Field(..., description="Listado unificado de departamentos organizacionales")

# ==============================================================================
# SUB-DOMINIO: EDIFICIOS
# ==============================================================================
class EdificioCreateBFF(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100, description="Nombre de la infraestructura")
    clave: Optional[str] = Field(None, max_length=20, description="Clave identificadora corta del edificio")

class EdificioUpdateBFF(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=100)
    clave: Optional[str] = Field(None, max_length=20)

class AulaSubInEdificioOut(BaseModel):
    id_aula: UUID
    nombre: str
    is_active: bool

    model_config = {
        "from_attributes": True
    }

class EdificioOutBFF(BaseModel):
    id_edificio: UUID
    nombre: str
    clave: Optional[str] = None
    is_active: bool
    aulas: List[AulaSubInEdificioOut] = []

    model_config = {
        "from_attributes": True
    }

class EdificioPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[EdificioOutBFF]

# ==============================================================================
# SUB-DOMINIO: AULAS
# ==============================================================================
class AulaCreateBFF(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100, description="Identificador del aula o laboratorio")

class AulaUpdateBFF(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=100)

class AulaOutBFF(BaseModel):
    id_aula: UUID
    id_edificio: UUID
    nombre: str
    is_active: bool

    model_config = {
        "from_attributes": True
    }

# ==============================================================================
# SUB-DOMINIO: DEPARTAMENTOS
# ==============================================================================
class DepartamentoCreateBFF(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150, description="Nombre oficial del departamento")
    id_jefe_departamento: Optional[UUID] = Field(None, description="UUID referencial débil del encargado en ms-personas")

class DepartamentoUpdateBFF(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    id_jefe_departamento: Optional[UUID] = None

class DepartamentoOutBFF(BaseModel):
    id_departamento: UUID
    nombre: str
    id_jefe_departamento: Optional[UUID] = None
    is_active: bool

    model_config = {
        "from_attributes": True
    }

class DepartamentoPaginatedOutBFF(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[DepartamentoOutBFF]