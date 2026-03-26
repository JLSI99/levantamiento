from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from src.database import get_db
from src import models, schemas

from src.dependencies.validar_rol_y_firma import require_authz, validate_jwt_token
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    tags=["Personas"],
    dependencies=[Depends(require_authz)]
)

@router.post(
    "/personas",
    response_model=schemas.PersonaOut,
    status_code=status.HTTP_201_CREATED    
)
@limiter.limit("30/minute")
async def create_persona(
    request: Request,
    persona_in: schemas.PersonaCreate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = jwt_payload.get('email','desconocido')

    nueva_persona = models.Persona(
        nombres=persona_in.nombres,
        apellidos=persona_in.apellidos,
        curp=persona_in.curp,
        is_active=True
    )
    
    db.add(nueva_persona)
    
    try:
        await db.commit()
        await db.refresh(nueva_persona)
        return nueva_persona
        
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una persona registrada con este CURP."
        )

@router.get(
    "/personas",
    response_model=schemas.PersonaPaginatedOut
)
@limiter.limit("30/minute")
async def list_personas(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100, description="Máximo 100 registros por petición"),
    offset: int = Query(0, ge=0, description="Registros a saltar (paginación)"),
    incluir_inactivos: bool = Query(False, description="Si es True, devuelve todos los registros, incluyendo dados de baja")
):
    total_stmt = select(func.count(models.Persona.id_persona))
    stmt = select(models.Persona)

    if not incluir_inactivos:
        total_stmt = total_stmt.where(models.Persona.is_active == True)
        stmt = stmt.where(models.Persona.is_active == True)

    total = await db.scalar(total_stmt)

    stmt = stmt.offset(offset).limit(limit)
    result = await db.execute(stmt)
    personas = result.scalars().all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "data": personas
    }

@router.patch(
    "/personas/{id_persona}",
    response_model=schemas.PersonaOut,
    status_code=status.HTTP_200_OK
)
@limiter.limit("30/minute")
async def update_persona(
    request: Request,
    id_persona: UUID,
    persona_in: schemas.PersonaUpdate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')

    stmt = select(models.Persona).where(models.Persona.id_persona == id_persona)
    result = await db.execute(stmt)
    persona = result.scalars().first()

    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada.")
    if not persona.is_active:
        raise HTTPException(status_code=400, detail="No puedes editar un registro inactivo.")

    update_data = persona_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(persona, key, value)

    try:
        await db.commit()
        await db.refresh(persona)
        return persona
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El CURP ingresado ya está asociado a otra persona."
        )

@router.delete(
    "/personas/{id_persona}",
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def delete_persona(
    request: Request,
    id_persona: UUID,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(validate_jwt_token)
):
    db.info['usuario_email'] = jwt_payload.get('email', 'desconocido')

    stmt = select(models.Persona).where(models.Persona.id_persona == id_persona)
    result = await db.execute(stmt)
    persona = result.scalars().first()

    if not persona:
        raise HTTPException(status_code=404, detail="Persona no encontrada.")
    if not persona.is_active:
        raise HTTPException(status_code=400, detail="Esta persona ya está dada de baja.")

    persona.is_active = False
    
    await db.commit()
    return