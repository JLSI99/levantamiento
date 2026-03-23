from slowapi import Limiter
from slowapi.util import get_remote_address

limiter=Limiter(
    key_func=get_remote_address,
    storage_uri="redis://itsc_redis_shared:6379/0"
)