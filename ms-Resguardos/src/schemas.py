from pydantic import BaseModel
from uuid import UUID
from datetime import date
from typing import Optional

class AsignacionCreate(BaseModel):
    id_bien: UUID
    id_usuario: UUID
    id_aula: UUID
    id_departamento: UUID

class AsignacionOut(AsignacionCreate):
    id_asignacion: UUID
    fecha_asignacion: date
    fecha_fin: Optional[date]
    class Config:
        orm_mode = True
        