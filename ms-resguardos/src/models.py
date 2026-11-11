import uuid
import datetime
import enum
from sqlalchemy import Column, String, Date, DateTime, Boolean, Index, func, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.hybrid import hybrid_property 
from src.database import Base

class EstadoSolicitud(str, enum.Enum):
    PENDIENTE = "PENDIENTE"
    APROBADA = "APROBADA"
    RECHAZADA = "RECHAZADA"
    CANCELADA = "CANCELADA"

class Asignacion(Base):
    __tablename__ = "asignaciones"

    id_asignacion = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    numero_inventario = Column(String, nullable=False, index=True)
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
            numero_inventario,
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


class SolicitudResguardo(Base):
    __tablename__ = "solicitudes_resguardo"

    id_solicitud = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    bien_solicitado = Column(String(150), nullable=False)
    curp_solicitante = Column(String(18), nullable=False, index=True)
    
    id_aula = Column(UUID(as_uuid=True), nullable=False)
    id_edificio = Column(UUID(as_uuid=True), nullable=False)
    id_departamento = Column(UUID(as_uuid=True), nullable=False)
    
    justificacion = Column(String(255), nullable=True)
    estado = Column(SQLEnum(EstadoSolicitud), default=EstadoSolicitud.PENDIENTE, nullable=False, index=True)
    
    fecha_solicitud = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    fecha_resolucion = Column(DateTime(timezone=True), nullable=True)
    
    curp_resolutor = Column(String(18), nullable=True)
    comentario_resolucion = Column(String(255), nullable=True)