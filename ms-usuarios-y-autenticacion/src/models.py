import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from src.database import Base

usuario_rol = Table(
    "usuario_rol",
    Base.metadata,
    Column(
        "id_usuario",
        UUID(as_uuid=True),
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        primary_key=True
    ),
    Column(
        "id_rol",
        Integer,
        ForeignKey("roles.id_rol", ondelete="CASCADE"),
        primary_key=True
    )
)

rol_permiso = Table(
    "rol_permiso",
    Base.metadata,
    Column(
        "id_rol",
        Integer,
        ForeignKey("roles.id_rol", ondelete="CASCADE"),
        primary_key=True
    ),
    Column(
        "id_permiso",
        Integer,
        ForeignKey("permisos.id_permiso", ondelete="CASCADE"),
        primary_key=True
    )
)

class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    curp = Column(
        String(18), 
        nullable=False, 
        unique=True, 
        index=True
    )
    username = Column(
        String(50), 
        unique=True, 
        nullable=False, 
        index=True
    )
    email = Column(
        String(150), 
        unique=True, 
        nullable=False, 
        index=True
    )
    hashed_password = Column(
        String(255), 
        nullable=False
    )
    is_active = Column(
        Boolean, 
        default=True
    )
    created_at = Column(
        DateTime(timezone=True), 
        server_default=func.now()
    )

    roles = relationship(
        "Rol", 
        secondary=usuario_rol, 
        back_populates="usuarios", 
        lazy="selectin"
    )


class Rol(Base):
    __tablename__ = "roles"

    id_rol = Column(
        Integer, 
        primary_key=True,
        autoincrement=True
    )
    nombre_rol = Column(
        String(100), 
        nullable=False, 
        unique=True
    )
    descripcion = Column(
        String(255), 
        nullable=True
    )

    usuarios = relationship(
        "Usuario", 
        secondary=usuario_rol, 
        back_populates="roles"
    )
    
    permisos = relationship(
        "Permiso", 
        secondary=rol_permiso, 
        back_populates="roles", 
        lazy="selectin"
    )


class Permiso(Base):

    __tablename__ = "permisos"

    id_permiso = Column(
        Integer, 
        primary_key=True, 
        autoincrement=True
    )
    nombre = Column(
        String(150), 
        nullable=False, 
        unique=True, 
        index=True
    )  # Ejemplo: "bienes:crear", "bienes:leer"
    descripcion = Column(
        String(255), 
        nullable=True
    )

    roles = relationship(
        "Rol", 
        secondary=rol_permiso, 
        back_populates="permisos"
    )

PermisoEndpoint = Permiso
from src.auditoria import Auditoria