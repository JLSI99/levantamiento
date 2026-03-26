import asyncio
import uuid
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker

from src.database import engine, Base
from src import models
from src.dependencies.hash_y_contrasenas import get_password_hash

ROLES_BASE = {
    1: ("Administrador", "Acceso total a la gestión de usuarios y auditoría."),
    2: ("Levantador", "Responsable de la carga inicial de bienes y activos."),
    3: ("Registrador", "Gestiona movimientos, altas y bajas de inventario."),
    4: ("Revisor", "Acceso de consulta y generación de reportes (Lectura)."),
    5: ("Resguardante", "Personal con activos asignados a su cargo."),
}

PERMISOS_BASE = [
    (1, "Registro de Usuarios", "/users", "POST", "Permite crear nuevos usuarios en el sistema"),
    (2, "Listar Usuarios", "/users", "GET", "Visualización de la lista de usuarios registrados"),
    (3, "Actualizar Usuario", "/users/{id_usuario}", "PATCH", "Modificar datos de un usuario existente"),
    (4, "Listar Roles", "/roles", "GET", "Consultar el catálogo de roles"),
    (5, "Ver Permisos de Rol", "/roles/{id_rol}/permisos", "GET", "Ver qué endpoints tiene permitido un rol"),
    (6, "Crear Permiso", "/roles/permisos", "POST", "Registrar un nuevo endpoint en la matriz"),
    (7, "Asignar Permiso a Rol", "/roles/{id_rol}/permisos/{id_permiso}", "POST", "Vincular un permiso con un rol"),
]

MATRIZ_ACCESO = {
    1: [1, 2, 3, 4, 5, 6, 7] 
}

USUARIOS_SEMILLA = [
    {
        "id": "4ed3fc1c-ccf8-4b12-a6c8-e3cd77b8a052", 
        "curp": "GOME900101HDFRRN01", 
        "user": "adminjgomez", 
        "email": "adminjgomez@example.com", 
        "rol": 1
    }
]

async def setup():
    print("🛠️  Iniciando Setup de Base de Datos...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Fase 1: Estructura de tablas verificada/creada.")

    async_session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session_factory() as session:
        try:
            print("🎭 Sembrando catálogo de Roles...")
            for id_r, (nom, desc) in ROLES_BASE.items():
                res = await session.execute(select(models.Rol).where(models.Rol.id_rol == id_r))
                if not res.scalar():
                    session.add(models.Rol(id_rol=id_r, nombre_rol=nom, descripcion=desc))
            
            await session.flush()

            print("🛣️  Sembrando catálogo de Permisos (Endpoints)...")
            for id_p, nom, path, metodo, desc in PERMISOS_BASE:
                res_p = await session.execute(
                    select(models.PermisoEndpoint).where(models.PermisoEndpoint.id_permiso == id_p)
                )
                if not res_p.scalar():
                    session.add(models.PermisoEndpoint(
                        id_permiso=id_p, nombre=nom, path_endpoint=path,
                        metodo_http=metodo, descripcion=desc
                    ))
            
            await session.flush()

            print("🔗 Configurando Matriz de Acceso (Roles <-> Permisos)...")
            for id_rol, permisos_asignados in MATRIZ_ACCESO.items():
                res_rol = await session.execute(
                    select(models.Rol).where(models.Rol.id_rol == id_rol)
                )
                rol_obj = res_rol.scalar()
                
                if rol_obj:
                    res_perms = await session.execute(
                        select(models.PermisoEndpoint).where(models.PermisoEndpoint.id_permiso.in_(permisos_asignados))
                    )
                    lista_permisos_db = res_perms.scalars().all()
                    
                    for p in lista_permisos_db:
                        if p not in rol_obj.permisos:
                            rol_obj.permisos.append(p)

            print("👤 Sembrando usuarios iniciales...")
            password_hash = get_password_hash("Password123")
            for u in USUARIOS_SEMILLA:
                res_u = await session.execute(select(models.Usuario).where(models.Usuario.username == u["user"]))
                if not res_u.scalar():
                    nuevo_usuario = models.Usuario(
                        id_usuario=uuid.UUID(u["id"]),
                        curp=u["curp"],
                        username=u["user"],
                        email=u["email"],
                        hashed_password=password_hash,
                        is_active=True
                    )
                    
                    res_rol_u = await session.execute(select(models.Rol).where(models.Rol.id_rol == u["rol"]))
                    rol_user = res_rol_u.scalar()
                    if rol_user:
                        nuevo_usuario.roles.append(rol_user)
                    
                    session.add(nuevo_usuario)

            await session.commit()
            print("🚀 Sembrado de datos finalizado con éxito.")

        except Exception as e:
            await session.rollback()
            print(f"❌ Error durante el sembrado: {e}")
            raise e

if __name__ == "__main__":
    asyncio.run(setup())