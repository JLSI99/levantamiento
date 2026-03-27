from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import date

class BienUI(BaseModel):
    id_bien: UUID
    descripcion: str
    serie: str
    marca: str
    modelo: str

class UbicacionUI(BaseModel):
    id_aula: UUID
    nombre_aula: str

class ResponsableUI(BaseModel):
    id_usuario: UUID
    username: str
    email: str
    curp: str
    nombre_completo: str

class ResguardoVistaUI(BaseModel):
    id_asignacion: UUID
    fecha_inicio: date
    fecha_fin: Optional[date]
    estado: str
    bien: BienUI
    ubicacion: UbicacionUI
    responsable: ResponsableUI