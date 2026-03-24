import uuid
import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import event
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

auditoria_temp_store = []

def get_estado_objeto(obj):
    """Convierte el estado de un objeto en un diccionario JSON-friendly"""
    estado = {}
    for prop in obj.__mapper__.column_attrs:
        key = prop.key
        valor = getattr(obj, key)
        if isinstance(valor, uuid.UUID):
            valor = str(valor)
        estado[key] = valor
    return estado

@event.listens_for(Session, "before_flush")
def auditar_antes_de_flush(session, flush_context, instances):
    usuario_actual = getattr(session, 'info', {}).get('usuario_email', 'sistema')

    # Detectar INSERTs
    for obj in session.new:
        if isinstance(obj, Auditoria): continue
        
        # Preparamos el registro pero NO calculamos el ID ni los datos nuevos todavía
        audit_obj = Auditoria(
            tabla_afectada=obj.__tablename__,
            accion='INSERT',
            usuario_email=usuario_actual
        )
        auditoria_temp_store.append({
            "audit_record": audit_obj,
            "target_obj": obj,
            "accion": 'INSERT'
        })

    # Detectar UPDATEs
    for obj in session.dirty:
        if isinstance(obj, Auditoria): continue
        if not session.is_modified(obj): continue
        
        registro_id = str(getattr(obj, obj.__mapper__.primary_key[0].name, 'N/A'))
        valores_viejos = {}
        valores_nuevos = {}
        
        for prop in obj.__mapper__.column_attrs:
            key = prop.key
            history = get_history(obj, key)
            if history.has_changes():
                viejo = history.deleted[0] if history.deleted else None
                nuevo = history.added[0] if history.added else None
                if isinstance(viejo, uuid.UUID): viejo = str(viejo)
                if isinstance(nuevo, uuid.UUID): nuevo = str(nuevo)
                valores_viejos[key] = viejo
                valores_nuevos[key] = nuevo
        
        if valores_viejos or valores_nuevos:
            audit_obj = Auditoria(
                tabla_afectada=obj.__tablename__,
                registro_id=registro_id,
                accion='UPDATE',
                usuario_email=usuario_actual,
                valores_viejos=valores_viejos,
                valores_nuevos=valores_nuevos
            )
            auditoria_temp_store.append({
                "audit_record": audit_obj,
                "target_obj": obj,
                "accion": 'UPDATE'
            })

    # Detectar DELETEs
    for obj in session.deleted:
        if isinstance(obj, Auditoria): continue
        registro_id = str(getattr(obj, obj.__mapper__.primary_key[0].name, 'N/A'))
        audit_obj = Auditoria(
            tabla_afectada=obj.__tablename__,
            registro_id=registro_id,
            accion='DELETE',
            usuario_email=usuario_actual,
            valores_viejos=get_estado_objeto(obj)
        )
        auditoria_temp_store.append({
            "audit_record": audit_obj,
            "target_obj": obj,
            "accion": 'DELETE'
        })

@event.listens_for(Session, "after_flush")
def auditar_despues_de_flush(session, flush_context):
    if auditoria_temp_store:
        for item in auditoria_temp_store:
            audit_record = item["audit_record"]
            target_obj = item["target_obj"]
            accion = item["accion"]
            
            # ¡AQUÍ ESTÁ LA MAGIA! 
            # Si es un INSERT, extraemos el ID y los datos ahora que ya se generaron
            if accion == 'INSERT':
                pk_name = target_obj.__mapper__.primary_key[0].name
                audit_record.registro_id = str(getattr(target_obj, pk_name, 'N/A'))
                audit_record.valores_nuevos = get_estado_objeto(target_obj)
            
            session.add(audit_record)
            
        auditoria_temp_store.clear()