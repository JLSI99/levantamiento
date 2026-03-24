from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date
from typing import Optional, List

class AsignacionCreate(BaseModel):
    id_bien: UUID=Field(...)
    id_usuario: UUID=Field(...)
    id_aula: UUID=Field(...)
    id_departamento: UUID=Field(...)

class AsignacionOut(AsignacionCreate):
    id_asignacion: UUID
    fecha_asignacion: date
    fecha_fin: Optional[date]=None
    
    model_config={"from_attributes": True}

class ASignacionPaginatedOut(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[AsignacionOut]