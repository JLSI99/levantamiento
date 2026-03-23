import uuid
from sqlalchemy import Column,String,Date,Boolean,Numeric,Table,ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.database import Base

bien_tipo_bien = Table(
    "bien_tipo_bien",
    Base.metadata,
    Column(
        "id_bien",
        UUID(as_uuid=True),
        ForeignKey("bienes.id_bien"),
        primary_key=True,
    ),
    Column(
        "id_tipo",
        UUID(as_uuid=True),
        ForeignKey("tipos_bien.id_tipo"),
        primary_key=True,
    ),
)

class Bien(Base):
    __tablename__ = "bienes"

    id_bien = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    serie = Column(String, unique=True, nullable=True)
    modelo = Column(String, nullable=True)
    marca = Column(String, nullable=True)
    descripcion = Column(String, nullable=False)

    costo = Column(Numeric(12, 2), nullable=False)
    fecha_adquisicion = Column(Date, nullable=True)

    esta_activo = Column(Boolean, default=True)

    tipos = relationship(
        "TipoBien",
        secondary=bien_tipo_bien,
        back_populates="bienes",
        lazy="selectin",
    )

class TipoBien(Base):
    __tablename__ = "tipos_bien"

    id_tipo = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, unique=True, nullable=False)
    tasa_depreciacion_anual = Column(Numeric(5, 2), default=0)

    bienes = relationship(
        "Bien",
        secondary=bien_tipo_bien,
        back_populates="tipos",
        lazy="selectin",
    )
