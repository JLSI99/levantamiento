import uuid
import datetime
from sqlalchemy import Column, String, Date, Boolean, Index, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.hybrid import hybrid_property 
from src.database import Base

class Asignacion(Base):
    __tablename__ = "asignaciones"

    id_asignacion = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    id_bien = Column(UUID(as_uuid=True), nullable=False, index=True)
    curp = Column(String(18), nullable=False, index=True)
    id_aula = Column(UUID(as_uuid=True), nullable=False) 
    id_edificio = Column(UUID(as_uuid=True), nullable=False)
    id_departamento = Column(UUID(as_uuid=True), nullable=False)
    
    fecha_inicio = Column(Date, nullable=False, server_default=func.current_date())
    fecha_fin = Column(Date, nullable=True)
    esta_activo = Column(Boolean, default=True, nullable=False) 

    __table_args__ = (
        Index(
            "idx_bien_unico_activo",
            id_bien,
            unique=True,
            postgresql_where=(esta_activo == True)
        ),
    )

    @hybrid_property
    def dias_vigencia(self) -> int:
        if not self.fecha_inicio:
            return 0
        final = self.fecha_fin if (self.fecha_fin or not self.esta_activo) else datetime.date.today()
        return max(0, (final - self.fecha_inicio).days)