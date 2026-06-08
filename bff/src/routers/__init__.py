from .auth import router as auth
from .bienes import router as bienes
from .admin import router as admin
from .resguardos import router as resguardos
from .ubicaciones import router as ubicaciones


__all__ = ["auth", "bienes"]