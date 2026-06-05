import asyncio
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:

    if not password:
        raise ValueError("La contraseña no puede estar vacía.")
    return pwd_context.hash(password)

async def get_password_hash_async(password: str) -> str:

    if not password:
        raise ValueError("La contraseña no puede estar vacía.")
    return await asyncio.to_thread(pwd_context.hash, password)

async def verify_password_async(plain_password: str, hashed_password: str) -> bool:

    if not plain_password or not hashed_password:
        return False
    return await asyncio.to_thread(pwd_context.verify, plain_password, hashed_password)