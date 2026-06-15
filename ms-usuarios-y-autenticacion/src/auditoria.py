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


def get_estado_objeto(obj):
    estado = {}
    for prop in obj.__mapper__.column_attrs:
        key = prop.key
        valor = getattr(obj, key)
        if isinstance(valor, uuid.UUID):
            valor = str(valor)
        elif isinstance(valor, (datetime.datetime, datetime.date)):
            valor = valor.isoformat()
        estado[key] = valor
    return estado


@event.listens_for(Session, "before_flush")
def auditar_antes_de_flush(session, flush_context, instances):
    if 'auditoria_temp_store' not in session.info:
        session.info['auditoria_temp_store'] = []

    usuario_actual = session.info.get('usuario_email', 'sistema')

    # --------------------------------------------------------------------------
    # DETECCIÓN DE INSERCIONES (INSERT)
    # --------------------------------------------------------------------------
    for obj in session.new:
        if isinstance(obj, Auditoria): 
            continue
        
        audit_obj = Auditoria(
            tabla_afectada=obj.__tablename__,
            registro_id="PENDIENTE", # Se resolverá en el after_flush una vez generado el PKey
            accion='INSERT',
            usuario_email=usuario_actual
        )
        session.info['auditoria_temp_store'].append({
            "audit_record": audit_obj,
            "target_obj": obj,
            "accion": 'INSERT'
        })

    # --------------------------------------------------------------------------
    # DETECCIÓN DE MODIFICACIONES (UPDATE)
    # --------------------------------------------------------------------------
    for obj in session.dirty:
        if isinstance(obj, Auditoria): 
            continue
        if not session.is_modified(obj): 
            continue
        
        pk_fields = obj.__mapper__.primary_key
        registro_id = "-".join([str(getattr(obj, pk.name)) for pk in pk_fields]) if pk_fields else 'N/A'
        
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
                if isinstance(viejo, (datetime.datetime, datetime.date)): viejo = viejo.isoformat()
                if isinstance(nuevo, (datetime.datetime, datetime.date)): nuevo = nuevo.isoformat()
                
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
            session.info['auditoria_temp_store'].append({
                "audit_record": audit_obj,
                "target_obj": obj,
                "accion": 'UPDATE'
            })

    # --------------------------------------------------------------------------
    # DETECCIÓN DE ELIMINACIONES (DELETE)
    # --------------------------------------------------------------------------
    for obj in session.deleted:
        if isinstance(obj, Auditoria): 
            continue
        
        pk_fields = obj.__mapper__.primary_key
        registro_id = "-".join([str(getattr(obj, pk.name)) for pk in pk_fields]) if pk_fields else 'N/A'
        
        audit_obj = Auditoria(
            tabla_afectada=obj.__tablename__,
            registro_id=registro_id,
            accion='DELETE',
            usuario_email=usuario_actual,
            valores_viejos=get_estado_objeto(obj)
        )
        session.info['auditoria_temp_store'].append({
            "audit_record": audit_obj,
            "target_obj": obj,
            "accion": 'DELETE'
        })

    # --------------------------------------------------------------------------
    # AUDITORÍA DE RELACIONES MANY-TO-MANY (Soportando session.dirty y session.new)
    # --------------------------------------------------------------------------
    # Concatenamos ambos conjuntos para asegurar capturar relaciones tanto en entidades
    # nuevas como en mutaciones de entidades preexistentes.
    todas_las_instancias = set(session.identity_map.values()).union(session.new).union(session.dirty)
    
    for obj in todas_las_instancias:
        if isinstance(obj, Auditoria): 
            continue
            
        mapper = obj.__mapper__
        for relationship in mapper.relationships:
            if relationship.secondary is not None:
                history = get_history(obj, relationship.key)
                
                if history.added:
                    for asociado in history.added:
                        pk_obj = mapper.primary_key[0].name
                        pk_asoc = asociado.__mapper__.primary_key[0].name
                        
                        id_origen_val = getattr(obj, pk_obj)
                        id_origen_str = str(id_origen_val) if id_origen_val is not None else "TRANSACCIONAL_NUEVO"
                        
                        audit_obj = Auditoria(
                            tabla_afectada=str(relationship.secondary.name),
                            registro_id=f"{obj.__class__.__name__}:{id_origen_str}",
                            accion='M2M_ADD',
                            usuario_email=usuario_actual,
                            valores_nuevos={
                                "origen_id": id_origen_str,
                                "asociado_id": str(getattr(asociado, pk_asoc)),
                                "relacion": relationship.key
                            }
                        )
                        # Agregamos directo a la lista temporal de almacenamiento
                        session.info['auditoria_temp_store'].append({
                            "audit_record": audit_obj,
                            "target_obj": obj,
                            "accion": 'M2M_ADD',
                            "relationship_key": relationship.key,
                            "asociado_obj": asociado
                        })
                        
                if history.deleted:
                    for asociado in history.deleted:
                        pk_obj = mapper.primary_key[0].name
                        pk_asoc = asociado.__mapper__.primary_key[0].name
                        
                        audit_obj = Auditoria(
                            tabla_afectada=str(relationship.secondary.name),
                            registro_id=f"{obj.__class__.__name__}:{getattr(obj, pk_obj)}",
                            accion='M2M_REM',
                            usuario_email=usuario_actual,
                            valores_viejos={
                                "origen_id": str(getattr(obj, pk_obj)),
                                "asociado_id": str(getattr(asociado, pk_asoc)),
                                "relacion": relationship.key
                            }
                        )
                        session.info['auditoria_temp_store'].append({
                            "audit_record": audit_obj,
                            "target_obj": obj,
                            "accion": 'M2M_REM',
                            "relationship_key": relationship.key,
                            "asociado_obj": asociado
                        })


@event.listens_for(Session, "after_flush")
def auditar_despues_de_flush(session, flush_context):
    temp_store = session.info.get('auditoria_temp_store', [])
    if not temp_store:
        return

    registros_a_guardar = []
    
    for item in temp_store:
        audit_record = item["audit_record"]
        target_obj = item["target_obj"]
        accion = item["accion"]
        
        pk_fields = target_obj.__mapper__.primary_key
        registro_id = "-".join([str(getattr(target_obj, pk.name)) for pk in pk_fields]) if pk_fields else 'N/A'
        
        if accion == 'INSERT':
            audit_record.registro_id = registro_id
            audit_record.valores_nuevos = get_estado_objeto(target_obj)
            registros_a_guardar.append(audit_record)
            
        elif accion in ('UPDATE', 'DELETE', 'M2M_REM'):
            registros_a_guardar.append(audit_record)
            
        elif accion == 'M2M_ADD':
            # Si el objeto padre era nuevo, su ID no existía en el before_flush.
            # Aquí en el after_flush el ID ya fue poblado por la base de datos de forma segura.
            if "TRANSACCIONAL_NUEVO" in audit_record.registro_id or "None" in audit_record.registro_id:
                pk_obj_name = target_obj.__mapper__.primary_key[0].name
                real_id = str(getattr(target_obj, pk_obj_name))
                audit_record.registro_id = f"{target_obj.__class__.__name__}:{real_id}"
                if audit_record.valores_nuevos:
                    audit_record.valores_nuevos["origen_id"] = real_id
            registros_a_guardar.append(audit_record)
    
    session.info['auditoria_temp_store'] = []
    
    # Inyección atómica en el pipeline de persistencia sin alterar el bucle de eventos asíncronos
    if registros_a_guardar:
        for record in registros_a_guardar:
            session.add(record)