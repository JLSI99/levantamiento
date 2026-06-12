
import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from src.database import engine, Base
from src import models
from src.auditoria import Auditoria
from src.dependencies.hash_y_contrasenas import get_password_hash

ROLES_BASE = {
    1: ("Administrador", "Acceso total y transversal a la gestión de usuarios, parametrización y auditoría de todo el ecosistema."),
    2: ("Levantador", "Personal operativo facultado para gestionar movimientos físicos de bienes de resguardante a resguardante."),
    3: ("Registrador", "Responsable directo de las operaciones de alta, baja, depreciación y modificación de bienes y activos."),
    4: ("Revisor", "Acceso restringido de consulta general, auditoría visual y generación de reportes e inventarios (Lectura)."),
    5: ("Resguardante", "Personal de la institución con activos y bienes públicos asignados a su cargo y custodia."),
}

PERMISOS_BASE = [
    # Dominio de Identidad: ms-usuarios-y-autenticacion
    (1, "usuarios:crear", "Permite registrar nuevos usuarios en el sistema central de credenciales"),
    (2, "usuarios:leer", "Visualización y paginación del catálogo de usuarios del sistema"),
    (3, "usuarios:editar", "Modificar propiedades de configuración de un usuario existente"),
    (4, "usuarios:borrar", "Inactivación o borrado lógico de cuentas de usuario"),
    (5, "roles:leer", "Consultar el catálogo global de roles institucionales"),
    (6, "roles:editar", "Modificar la matriz relacional de asignación de capacidades a roles"),
    # Dominio de Personas: ms-personas
    (7, "personas:crear", "Permite registrar formalmente a una persona en el padrón institucional"),
    (8, "personas:leer", "Consultar y listar el padrón general de personas registradas"),
    (9, "personas:editar", "Actualizar la metadata civil o laboral de una persona"),
    (10, "personas:eliminar", "Baja lógica de una persona dentro del padrón activo"),
    # Dominio de Activos: ms-bienes
    (11, "bienes:crear", "Registrar un nuevo bien mueble o activo en el inventario institucional"),
    (12, "bienes:leer", "Consultar las fichas técnicas y estados de los bienes patrimoniales"),
    (13, "bienes:editar", "Modificar valores, depreciaciones o características de un activo"),
    (14, "bienes:eliminar", "Dar de baja física y contable un activo por obsolescencia o siniestro"),
    # Dominio de Custodia: ms-resguardos
    (15, "resguardos:crear", "Asignar jurídicamente la custodia de un bien a un resguardante"),
    (16, "resguardos:leer", "Consultar el histórico y las actas de resguardo vigentes"),
    (17, "resguardos:editar", "Modificar términos, observaciones o firmas de un acta de resguardo"),
    (18, "resguardos:eliminar", "Liberar a un resguardante de la custodia de un bien (retorno o transferencia)"),
    # Dominio de Ubicaciones: ms-ubicaciones
    (19, "ubicaciones:crear", "Dar de alta nuevos campus, edificios, almacenes o zonas físicas"),
    (20, "ubicaciones:leer", "Consultar el catálogo geográfico y estructural de inmuebles"),
    (21, "ubicaciones:editar", "Modificar delimitaciones o nomenclaturas de espacios físicos"),
    (22, "ubicaciones:eliminar", "Dar de baja zonas físicas o áreas de resguardo en desuso"),
    (23, "departamentos:leer", "Consultar el organigrama y catálogo de departamentos institucionales"),
    (24, "departamentos:editar", "Modificar estructuras organizacionales o jefaturas de departamento")
]

MATRIZ_ACCESO = {
    1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    2: [8, 12, 15, 16, 17, 20, 23],
    3: [7, 8, 9, 10, 11, 12, 13, 14, 20, 23],
    4: [2, 5, 8, 12, 16, 20, 23],
    5: [12, 16, 20]
}

# Modificación estructural: Expansión de la topología de semillas para abarcar todos los nodos RBAC
USUARIOS_SEMILLA = [
    {
        "id": "4ed3fc1c-ccf8-4b12-a6c8-e3cd77b8a052", 
        "curp": "GOME900101HDFRRN01", 
        "user": "adminjgomez", 
        "email": "adminjgomez@example.com", 
        "rol": 1  # Administrador
    },
    {
        "id": "18b95982-f3f2-4bd5-a129-dfec4087e8f1", 
        "curp": "LEVA910202HDFRRN02", 
        "user": "levantador_op", 
        "email": "levantador@example.com", 
        "rol": 2  # Levantador
    },
    {
        "id": "893c524f-83a1-4354-9469-803dfa4bebb2", 
        "curp": "REGI920303HDFRRN03", 
        "user": "registrador_act", 
        "email": "registrador@example.com", 
        "rol": 3  # Registrador
    },
    {
        "id": "e45cd0a2-21d7-4663-8a3d-4c7b8e5c329a", 
        "curp": "REVI930404HDFRRN04", 
        "user": "revisor_aud", 
        "email": "revisor@example.com", 
        "rol": 4  # Revisor
    },
    {
        "id": "cf6c8d23-74b8-4e89-9e17-7e781190cd5b", 
        "curp": "RESG940505HDFRRN05", 
        "user": "resguardante_usr", 
        "email": "resguardante@example.com", 
        "rol": 5  # Resguardante
    }
]

async def setup():
    print("🛠️  Iniciando Setup Seguro de Base de Datos Transversal...")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Fase 1: Estructura de tablas, llaves foráneas e índices verificada.")

    async_session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session_factory() as session:
        try:
            print("🎭 Sembrando catálogo institucional de Roles...")
            for id_r, (nom, desc) in ROLES_BASE.items():
                res = await session.execute(select(models.Rol).where(models.Rol.id_rol == id_r))
                if not res.scalar():
                    session.add(models.Rol(id_rol=id_r, nombre_rol=nom, descripcion=desc))
            await session.flush()

            print("🛣️  Sembrando catálogo maestro de Capacidades por Dominio (Namespaces)...")
            for id_p, nom, desc in PERMISOS_BASE:
                res_p = await session.execute(select(models.Permiso).where(models.Permiso.id_permiso == id_p))
                if not res_p.scalar():
                    session.add(models.Permiso(id_permiso=id_p, nombre=nom, descripcion=desc))
            await session.flush()

            print("🔗 Configurando Matriz de Acceso Multidominio (Roles <-> Capabilities)...")
            for id_rol, permisos_asignados in MATRIZ_ACCESO.items():
                res_rol = await session.execute(select(models.Rol).where(models.Rol.id_rol == id_rol))
                rol_obj = res_rol.scalar()
                
                if rol_obj:
                    res_perms = await session.execute(
                        select(models.Permiso).where(models.Permiso.id_permiso.in_(permisos_asignados))
                    )
                    lista_permisos_db = res_perms.scalars().all()
                    for p in lista_permisos_db:
                        if p not in rol_obj.permisos:
                            rol_obj.permisos.append(p)
            await session.flush()

            print("👤 Generando Credenciales Criptográficas de la Identidad Raíz...")
            # Delegación de operaciones ligadas a CPU al ThreadPoolExecutor
            password_hash = await asyncio.to_thread(get_password_hash, "Password123")
            
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

            # Transición de estado: Flush final de datos y liberación de candados (locks) relacionales
            await session.commit()
            print("🚀 El ecosistema distribuido ha sido aprovisionado con Capacidades exitosamente.")

        except Exception as e:
            await session.rollback()
            print(f"❌ Error crítico insalvable durante el aprovisionamiento de semillas: {e}")
            raise e

if __name__ == "__main__":
    asyncio.run(setup())