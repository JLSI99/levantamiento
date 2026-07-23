import os
from slowapi import Limiter
from slowapi.util import get_remote_address

STORAGE_URI = os.getenv("REDIS_STORAGE_URI", "redis://itsc_redis_shared:6379/0")

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=STORAGE_URI
)