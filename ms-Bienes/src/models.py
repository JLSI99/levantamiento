import uuid
import datetime
from sqlalchemy import Column, String, Date, Boolean, Numeric, Table, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.ext.hybrid import hybrid_property 
from src.database import Base

bien_tipo_bien = Table(
    "bien_tipo_bien",
    Base.metadata,
    Column("id_bien", UUID(as_uuid=True), ForeignKey("bienes.id_bien"), primary_key=True),
    Column("id_tipo", UUID(as_uuid=True), ForeignKey("tipos_bien.id_tipo"), primary_key=True),
)

class Bien(Base):
    __tablename__ = "bienes"

    id_bien = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    serie = Column(String(50), unique=True, nullable=True) 
    modelo = Column(String(100), nullable=True)
    marca = Column(String(100), nullable=True)
    descripcion = Column(String(255), nullable=False)

    costo = Column(Numeric(12, 2), nullable=False)
    fecha_adquisicion = Column(Date, nullable=True)

    esta_activo = Column(Boolean, default=True) 

    tipos = relationship(
        "TipoBien",
        secondary=bien_tipo_bien,
        back_populates="bienes",
        lazy="selectin",
    )

    @hybrid_property
    def meses_uso(self):
        if not self.fecha_adquisicion:
            return 0
        hoy = datetime.date.today()
        dias = (hoy - self.fecha_adquisicion).days
        return max(0, dias // 30)

class TipoBien(Base):
    __tablename__ = "tipos_bien"

    id_tipo = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String(100), unique=True, nullable=False)
    tasa_depreciacion_anual = Column(Numeric(5, 2), default=0)
    
    esta_activo = Column(Boolean, default=True)

    bienes = relationship(
        "Bien",
        secondary=bien_tipo_bien,
        back_populates="tipos",
        lazy="selectin",
    )