from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from typing import Optional

from src.database import get_db
from src import models, schemas
from src.dependencies.validar_rol_y_firma import require_capability
from src.dependencies.rate_limiter import limiter

router = APIRouter(
    prefix="/personas",
    tags=["Personas"]
)

@router.post(
    "",
    response_model=schemas.PersonaOut,
    status_code=status.HTTP_201_CREATED    
)
@limiter.limit("30/minute")
async def create_persona(
    request: Request,
    persona_in: schemas.PersonaCreate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("personas:crear"))
):
    curp_normalizada = persona_in.curp.upper().strip()
    
    stmt_existente = select(models.Persona).where(models.Persona.curp == curp_normalizada)
    result_existente = await db.execute(stmt_existente)
    persona_existente = result_existente.scalars().first()
    
    if persona_existente:
        if persona_existente.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una persona registrada con este CURP."
            )
        else:
            # Fase de Absorción y Reactivación: Recupera el registro inactivo de una saga abortada previa
            persona_existente.nombres = persona_in.nombres.strip()
            persona_existente.apellidos = persona_in.apellidos.strip()
            persona_existente.is_active = True
            
            try:
                await db.commit()
                await db.refresh(persona_existente)
                return persona_existente
            except IntegrityError:
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Error de consistencia al intentar reactivar registro demográfico histórico."
                )

    nueva_persona = models.Persona(
        nombres=persona_in.nombres.strip(),
        apellidos=persona_in.apellidos.strip(),
        curp=curp_normalizada,
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
    "",
    response_model=schemas.PersonaPaginatedOut
)
@limiter.limit("30/minute")
async def list_personas(
    request: Request,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100, description="Máximo 100 registros por petición"),
    offset: int = Query(0, ge=0, description="Registros a saltar (paginación)"),
    incluir_inactivos: bool = Query(False, description="Si es True, devuelve todos los registros, incluyendo dados de baja"),
    curp: Optional[str] = Query(None, description="Filtrar por curp exacto"),
    jwt_payload: dict = Depends(require_capability("personas:leer"))
):
    total_stmt = select(func.count(models.Persona.id_persona))
    stmt = select(models.Persona)

    if not incluir_inactivos:
        total_stmt = total_stmt.where(models.Persona.is_active == True)
        stmt = stmt.where(models.Persona.is_active == True)

    if curp: 
        curp_target = curp.upper().strip()
        total_stmt = total_stmt.where(models.Persona.curp == curp_target)
        stmt = stmt.where(models.Persona.curp == curp_target)

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

@router.get(
    "/{id_persona}",
    response_model=schemas.PersonaOut,
    status_code=status.HTTP_200_OK
)
@limiter.limit("30/minute")
async def get_persona(
    request: Request,
    id_persona: UUID,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("personas:leer"))
):
    stmt = select(models.Persona).where(models.Persona.id_persona == id_persona)
    result = await db.execute(stmt)
    persona = result.scalars().first()

    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona no encontrada.")

    return persona

@router.patch(
    "/{id_persona}",
    response_model=schemas.PersonaOut,
    status_code=status.HTTP_200_OK
)
@limiter.limit("30/minute")
async def update_persona(
    request: Request,
    id_persona: UUID,
    persona_in: schemas.PersonaUpdate,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("personas:editar"))
):
    stmt = select(models.Persona).where(models.Persona.id_persona == id_persona)
    result = await db.execute(stmt)
    persona = result.scalars().first()

    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona no encontrada.")
    if not persona.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No puedes editar un registro inactivo.")

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
    "/{id_persona}",
    status_code=status.HTTP_204_NO_CONTENT
)
@limiter.limit("10/minute")
async def delete_persona(
    request: Request,
    id_persona: UUID,
    db: AsyncSession = Depends(get_db),
    jwt_payload: dict = Depends(require_capability("personas:borrar"))
):
    stmt = select(models.Persona).where(models.Persona.id_persona == id_persona)
    result = await db.execute(stmt)
    persona = result.scalars().first()

    if not persona:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona no encontrada.")
    if not persona.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Esta persona ya está dada de baja.")

    persona.is_active = False
    await db.commit()
    return