from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from src.database import get_db
from src import models, schemas
from src.dependencies.hash_y_contrasenas import get_password_hash
from src.dependencies.validar_rol_y_firma import require_authz

router = APIRouter(
    prefix="/users",
    tags=["Usuarios"]
)


@router.post(
    "",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_authz)]
)
async def create_user(
    user_in: schemas.UserRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
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
    response_model=list[schemas.UserOut],
    dependecies=[Depends(require_authz)]
)
async def list_users(
    db: AsyncSession = Depends(get_db)
):
    stmt = select(models.Usuario)
    result = await db.execute(stmt)
    return result.scalars().all()