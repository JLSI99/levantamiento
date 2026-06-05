import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

modo_debug = os.getenv("DEBUG") == "True"

DATABASE_URL = (
    f"postgresql+asyncpg://{os.getenv('DB_USER')}:"
    f"{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}/"
    f"{os.getenv('DB_NAME')}"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=modo_debug,
    future=True,
    pool_size=15,          # Incrementado para mitigar starvation bajo ráfagas concurrentes
    max_overflow=25,       # Conexiones adicionales permitidas sobre el pool_size mínimo
    pool_timeout=15.0,     # Tiempo máximo de espera por una conexión libre del pool
    pool_recycle=1800      # Reciclaje forzado a los 30 minutos para evitar staled connections
)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False 
)

Base = declarative_base()

async def get_db():

    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            session.info.clear()
            await session.close()