import uuid
from sqlalchemy import Column, String, Boolean
from sqlalchemy.dialects.postgresql import UUID
from src.database import Base

class Persona(Base):
    __tablename__ = "personas"

    id_persona = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    nombres = Column(String(100), nullable=False)
    apellidos = Column(String(100), nullable=False)

    curp = Column(
        String(18), 
        nullable=False, 
        unique=True, 
        index=True
    )
    
    is_active = Column(Boolean, default=True)

    @property
    def nombre_completo(self):
        return f"{self.nombres} {self.apellidos}"