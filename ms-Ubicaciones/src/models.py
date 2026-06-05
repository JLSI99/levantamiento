import uuid
from sqlalchemy import Column, String, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.database import Base

class Departamento(Base):
    __tablename__ = "departamentos"

    id_departamento = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(150), unique=True, nullable=False, index=True)
    id_jefe_departamento = Column(UUID(as_uuid=True), nullable=True) # ID lógico débil a ms-personas
    is_active = Column(Boolean, default=True, nullable=False)


class Edificio(Base):
    __tablename__ = "edificios"

    id_edificio = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), unique=True, nullable=False, index=True)
    clave = Column(String(20), unique=True, nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    aulas = relationship(
        "Aula",
        back_populates="edificio",
        cascade="all, delete-orphan",
        lazy="selectin"
    )


class Aula(Base):
    __tablename__ = "aulas"

    id_aula = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), nullable=False)
    id_edificio = Column(UUID(as_uuid=True), ForeignKey("edificios.id_edificio", ondelete="CASCADE"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    edificio = relationship("Edificio", back_populates="aulas")