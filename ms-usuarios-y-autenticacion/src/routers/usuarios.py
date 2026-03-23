from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from sqlalchemy.orm import selectinload

from src.database import get_db
from src import models, schemas

from src.dependencies.hash_y_contrasenas import get_password_hash
from src.dependencies.validar_rol_y_firma import require_authz, validate_jwt_token

from src.dependencies.rate_limiter import limiter

router = APIRouter(
    prefix="/users",
    tags=["Usuarios"],
    dependencies=[Depends(require_authz)]
)


@router.post(
    "",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED
)
@limiter.limit("30/minute")
async def create_user(
    user_in: schemas.UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict =Depends(validate_jwt_token)
):
    
    db.info['usuario_email']=jwt_payload.get('email','desconocido')

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
                status_code=400,
                detail="El email, username o CURP ya están registrados."
            )

        stmt_roles = select(models.Rol).where(
            models.Rol.id_rol.in_(user_in.role_ids)
        )
        result_roles = await db.execute(stmt_roles)
        roles = result_roles.scalars().all()

        if not roles:
            raise HTTPException(
                status_code=400,
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

    await db.refresh(user)
    return user


@router.get(
    "",
    response_model=schemas.UserPaginatedOut
)
@limiter.limit("30/minute")
async def list_users(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100, description="Máximo 100 usuarios por petición"),
    offset: int = Query(0, ge=0, description="Registros a saltar (paginación)")
):
    total_stmt = select(func.count(models.Usuario.id_usuario))
    total = await db.scalar(total_stmt)

    stmt = select(models.Usuario).options(selectinload(models.Usuario.roles)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    usuarios = result.scalars().all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": usuarios
    }