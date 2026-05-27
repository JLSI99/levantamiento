import uuid
import datetime
from sqlalchemy import Column, String, DateTime, event
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm.attributes import get_history
from sqlalchemy.orm import Session
from src.database import Base

class Auditoria(Base):
    __tablename__ = "auditoria"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tabla_afectada = Column(String(100), nullable=False)
    registro_id = Column(String(255), nullable=False)
    accion = Column(String(10), nullable=False)
    usuario_email = Column(String(255), nullable=True)
    fecha = Column(DateTime, default=datetime.datetime.utcnow)
    valores_viejos = Column(JSONB, nullable=True)
    valores_nuevos = Column(JSONB, nullable=True)

def get_estado_objeto(obj):
    """Extrae el estado actual de un objeto para auditoría."""
    estado = {}
    for prop in obj.__mapper__.column_attrs:
        key = prop.key
        valor = getattr(obj, key)
        if isinstance(valor, uuid.UUID): valor = str(valor)
        elif isinstance(valor, (datetime.date, datetime.datetime)): valor = valor.isoformat()
        estado[key] = valor
    return estado

@event.listens_for(Session, "before_flush")
def auditar_antes_de_flush(session, flush_context, instances):
    usuario_actual = session.info.get('usuario_email', 'sistema')

    # Almacenamiento local a la sesión para evitar colisiones entre usuarios
    if 'audit_entries' not in session.info:
        session.info['audit_entries'] = []

    # Procesamiento de registros nuevos
    for obj in session.new:
        if isinstance(obj, Auditoria): continue
        audit_obj = Auditoria(
            tabla_afectada=obj.__tablename__,
            accion='INSERT',
            usuario_email=usuario_actual
        )
        session.info['audit_entries'].append({"audit_record": audit_obj, "target_obj": obj, "accion": 'INSERT'})

    # Procesamiento de cambios (Update)
    for obj in session.dirty:
        if isinstance(obj, Auditoria) or not session.is_modified(obj): continue
        
        registro_id = str(getattr(obj, obj.__mapper__.primary_key[0].name, 'N/A'))
        viejos, nuevos = {}, {}
        
        for prop in obj.__mapper__.column_attrs:
            key = prop.key
            history = get_history(obj, key)
            if history.has_changes():
                v = history.deleted[0] if history.deleted else None
                n = history.added[0] if history.added else None
                viejos[key] = str(v) if isinstance(v, uuid.UUID) else v
                nuevos[key] = str(n) if isinstance(n, uuid.UUID) else n
        
        if viejos or nuevos:
            audit_obj = Auditoria(
                tabla_afectada=obj.__tablename__, registro_id=registro_id,
                accion='UPDATE', usuario_email=usuario_actual,
                valores_viejos=viejos, valores_nuevos=nuevos
            )
            session.info['audit_entries'].append({"audit_record": audit_obj, "target_obj": obj, "accion": 'UPDATE'})

@event.listens_for(Session, "after_flush")
def auditar_despues_de_flush(session, flush_context):
    audit_entries = session.info.get('audit_entries', [])
    if not audit_entries:
        return

    for item in audit_entries:
        audit_record = item["audit_record"]
        target_obj = item["target_obj"]
        
        # En INSERT, los IDs se generan después del flush, los capturamos aquí.
        if item["accion"] == 'INSERT':
            pk_name = target_obj.__mapper__.primary_key[0].name
            audit_record.registro_id = str(getattr(target_obj, pk_name, 'N/A'))
            audit_record.valores_nuevos = get_estado_objeto(target_obj)
        
        session.add(audit_record)
        
    # Limpiamos solo los registros de esta sesión específica
    session.info['audit_entries'] = []