from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID


class AulaBase(BaseModel):
    nombre: str

class AulaCreate(AulaBase):
    pass

class AulaOut(AulaBase):
    id_aula: UUID
    id_edificio: UUID

    class Config:
        orm_mode = True

class EdificioBase(BaseModel):
    nombre: str
    clave: Optional[str] = None

class EdificioCreate(EdificioBase):
    pass

class EdificioOut(EdificioBase):
    id_edificio: UUID
    aulas: List[AulaOut] = []

    class Config:
        orm_mode = True

class DepartamentoCreate(BaseModel):
    nombre: str
    id_jefe_departamento: Optional[UUID] = None

class DepartamentoOut(DepartamentoCreate):
    id_departamento: UUID

    class Config:
        orm_mode = True
