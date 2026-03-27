from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date
from typing import Optional, List

class AsignacionCreate(BaseModel):
    id_bien: UUID = Field(...)
    id_usuario: UUID = Field(...)
    id_aula: UUID = Field(...)
    id_edificio: UUID = Field(...) 
    id_departamento: UUID = Field(...)

class AsignacionUpdate(BaseModel):
    id_bien: Optional[UUID] = None
    id_usuario: Optional[UUID] = None
    id_aula: Optional[UUID] = None
    id_edificio: Optional[UUID] = None
    id_departamento: Optional[UUID] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None

class AsignacionOut(AsignacionCreate):
    id_asignacion: UUID
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    esta_activo: bool
    
    model_config = {"from_attributes": True}

class AsignacionPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[AsignacionOut]