import httpx
from fastapi import Request

_bff_http_client: httpx.AsyncClient | None = None

def init_bff_http_client() -> httpx.AsyncClient:

    global _bff_http_client
    
    if _bff_http_client is None:
        limits = httpx.Limits(max_connections=100, max_keepalive_connections=20)
        timeout = httpx.Timeout(5.0)
        
        _bff_http_client = httpx.AsyncClient(
            limits=limits,
            timeout=timeout,
            headers={"X-Requested-With": "BFF-Gateway"}
        )
    return _bff_http_client

async def close_bff_http_client() -> None:

    global _bff_http_client
    if _bff_http_client is not None:
        await _bff_http_client.aclose()
        _bff_http_client = None

async def get_bff_http_client(request: Request) -> httpx.AsyncClient:

    client = getattr(request.app.state, "http_client", None)
    if client is None:
        raise RuntimeError("El cliente HTTP no ha sido inicializado en el estado de la aplicación.")
    return client