import uuid
from sqlalchemy import Column, Date, Boolean
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base
from datetime import date

class Asignacion(Base):
    __tablename__ = "asignaciones"

    id_asignacion = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    id_bien = Column(UUID(as_uuid=True), nullable=False, index=True)       
    id_usuario = Column(UUID(as_uuid=True), nullable=False, index=True)    
    id_aula = Column(UUID(as_uuid=True), nullable=False) 
    id_edificio = Column(UUID(as_uuid=True), nullable=False)            
    id_departamento = Column(UUID(as_uuid=True), nullable=False)           
    
    fecha_inicio = Column(Date, nullable=False, default=date.today)
    fecha_fin = Column(Date, nullable=True)

    esta_activo = Column(Boolean, default=True)