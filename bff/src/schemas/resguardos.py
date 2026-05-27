from pydantic import BaseModel
from uuid import UUID
from datetime import date
from typing import Optional, List

class AsignacionCreateBFF(BaseModel):
    id_bien: UUID
    id_usuario: UUID

class AsignacionDetalladaBFF(BaseModel):
    id_asignacion: UUID
    fecha_inicio: date
    bien_nombre: str
    bien_serie: Optional[str]
    usuario_nombre: str
    usuario_email: str
    esta_activo: bool

class AsignacionPaginatedBFFOut(BaseModel):
    total:int
    limit:int
    offset: int
    data: List[AsignacionDetalladaBFF]