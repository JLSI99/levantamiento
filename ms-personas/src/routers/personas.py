from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from src.database import get_db
from src import models, schemas

router = APIRouter(tags=["Personas"])

@router.post(
    "/personas",
    response_model=schemas.PersonaOut,
    status_code=status.HTTP_201_CREATED
)
async def create_persona(
    persona_in: schemas.PersonaCreate,
    db: AsyncSession = Depends(get_db)
):
    nueva_persona = models.Persona(
        nombres=persona_in.nombres,
        apellidos=persona_in.apellidos,
        curp=persona_in.curp
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
    response_model=list[schemas.PersonaOut]
)
async def list_personas(
    db: AsyncSession = Depends(get_db)
):
    stmt = select(models.Persona)
    result = await db.execute(stmt)
    personas = result.scalars().all()
    return personas