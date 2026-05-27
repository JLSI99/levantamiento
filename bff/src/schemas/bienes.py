from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import date

class BienCreateBFF(BaseModel):
    serie: Optional[str]=None
    modelo: Optional[str]=None
    marca: Optional[str]=None
    descripcion: str
    costo: float
    fecha_adquisicion: Optional[date]=None
    tipos_ids:List[UUID]