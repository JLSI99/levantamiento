from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from uuid import UUID

from src.database import get_db
from src import models, schemas

from src.dependencies.hash_y_contrasenas import get_password_hash
from src.dependencies.validar_rol_y_firma import require_capability, validate_jwt_token
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    prefix="/users",
    tags=["Usuarios"]
)

@router.post(
    "",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def create_user(
    request: Request,
    user_in: schemas.UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("usuarios:crear"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')

    async with db.begin():
        stmt_user = select(models.Usuario).where(
            or_(
                models.Usuario.email == user_in.email,
                models.Usuario.username == user_in.username,
                models.Usuario.curp == user_in.curp
            )
        )
        result_user = await db.execute(stmt_user)
        if result_user.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El email, username o CURP ya están registrados."
            )

        stmt_roles = select(models.Rol).where(
            models.Rol.id_rol.in_(user_in.role_ids)
        )
        result_roles = await db.execute(stmt_roles)
        roles = result_roles.scalars().all()

        if not roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Los roles proporcionados no son válidos."
            )

        user = models.Usuario(
            curp=user_in.curp,
            username=user_in.username,
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
            is_active=True,
            roles=roles
        )

        db.add(user)
        await db.flush()      
        await db.refresh(user) 

    return user

@router.get(
    "",
    response_model=schemas.UserPaginatedOut
)
@limiter.limit("30/minute")
async def list_users(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100, description="Máximo 100 usuarios por petición"),
    offset: int = Query(0, ge=0, description="Registros a saltar (paginación)"),
    incluir_inactivos: bool = Query(False, description="Si es True, devuelve todos los usuarios"),
    jwt_payload: dict = Depends(require_capability("usuarios:leer"))
):
    total_stmt = select(func.count(models.Usuario.id_usuario))
    stmt = select(models.Usuario).options(selectinload(models.Usuario.roles))

    if not incluir_inactivos:
        total_stmt = total_stmt.where(models.Usuario.is_active == True)
        stmt = stmt.where(models.Usuario.is_active == True)

    total = await db.scalar(total_stmt)

    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    usuarios = result.scalars().all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": usuarios
    }

@router.get(
    "/me/profile",
    response_model=schemas.UserOut,
    status_code=status.HTTP_200_OK
)
@limiter.limit("60/minute")
async def get_my_profile(
    request: Request,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(validate_jwt_token)
):
    email_usuario = jwt_payload.get('email')
    db.info['usuario_email'] = email_usuario

    stmt = select(models.Usuario).options(
        selectinload(models.Usuario.roles)
    ).where(models.Usuario.email == email_usuario)
    
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado o token inválido.")
        
    return user

@router.get(
    "/{id_usuario}",
    response_model=schemas.UserOut,
    status_code=status.HTTP_200_OK
)
@limiter.limit("60/minute")
async def get_user(
    request: Request,
    id_usuario: UUID,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("usuarios:leer"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')

    stmt = select(models.Usuario).options(
        selectinload(models.Usuario.roles)
    ).where(models.Usuario.id_usuario == id_usuario)
    
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")

    return user

@router.patch(
    "/{id_usuario}",
    response_model=schemas.UserOut,
    status_code=status.HTTP_200_OK
)
@limiter.limit("30/minute")
async def update_user(
    request: Request,
    id_usuario: UUID,
    user_in: schemas.UserUpdate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("usuarios:editar"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')

    async with db.begin():
        stmt = select(models.Usuario).options(selectinload(models.Usuario.roles)).where(models.Usuario.id_usuario == id_usuario)
        result = await db.execute(stmt)
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes editar un usuario inactivo.")

        update_data = user_in.model_dump(exclude_unset=True)

        if "password" in update_data:
            raw_password = update_data.pop("password")
            update_data["hashed_password"] = get_password_hash(raw_password)

        for key, value in update_data.items():
            setattr(user, key, value)

        await db.flush()
        await db.refresh(user)
    
    return user

@router.put(
    "/{id_usuario}/roles",
    response_model=schemas.UserOut,
    status_code=status.HTTP_200_OK
)
@limiter.limit("20/minute")
async def update_user_roles(
    request: Request,
    id_usuario: UUID,
    roles_in: schemas.UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("usuarios:editar"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')

    async with db.begin():
        stmt_user = select(models.Usuario).options(
            selectinload(models.Usuario.roles)
        ).where(models.Usuario.id_usuario == id_usuario)
        
        result_user = await db.execute(stmt_user)
        user = result_user.scalars().first()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes modificar roles de un usuario inactivo.")

        stmt_roles = select(models.Rol).where(
            models.Rol.id_rol.in_(roles_in.role_ids)
        )
        result_roles = await db.execute(stmt_roles)
        nuevos_roles = result_roles.scalars().all()

        if not nuevos_roles:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Los roles proporcionados no existen o son inválidos.")

        user.roles = nuevos_roles

        await db.flush()
        await db.refresh(user)
    
    return user

@router.delete(
    "/{id_usuario}",
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def delete_user(
    request: Request,
    id_usuario: UUID,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("usuarios:borrar"))
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')

    async with db.begin():
        stmt = select(models.Usuario).where(models.Usuario.id_usuario == id_usuario)
        result = await db.execute(stmt)
        user = result.scalars().first()

        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado.")
        if not user.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este usuario ya está dado de baja.")

        user.is_active = False
        await db.flush()
        
    return