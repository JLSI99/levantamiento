import httpx
from fastapi import Request

# Instancia global oculta para inicialización controlada en el lifespan
_bff_http_client: httpx.AsyncClient | None = None

def init_bff_http_client() -> httpx.AsyncClient:
    """
    Inicializa el cliente HTTP asíncrono global configurando el pool de conexiones.
    Esta función debe invocarse exclusivamente dentro del manejador 'lifespan' de la aplicación.
    
    Configuraciones de límites de Conexión:
    - max_connections: Límite máximo de conexiones simultáneas permitidas en el pool.
    - max_keepalive_connections: Cantidad de conexiones inactivas que se mantienen abiertas.
    - timeout: Límite de tiempo de espera (5 segundos para lectura/escritura/conexión).
    """
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
    """
    Cierra de manera limpia el cliente HTTP asíncrono y libera el pool de conexiones.
    Garantiza el 'graceful shutdown' del contenedor para evitar fugas de memoria y sockets colgados.
    """
    global _bff_http_client
    if _bff_http_client is not None:
        await _bff_http_client.aclose()
        _bff_http_client = None

async def get_bff_http_client(request: Request) -> httpx.AsyncClient:
    """
    Dependencia de FastAPI para inyectar el cliente HTTP en los routers.
    Extrae la instancia compartida directamente desde el estado de la aplicación
    para garantizar la reutilización del pool.
    
    Args:
        request (Request): Objeto de petición nativo de FastAPI que contiene el estado global.
        
    Returns:
        httpx.AsyncClient: El cliente asíncrono activo configurado.
    """
    client = getattr(request.app.state, "http_client", None)
    if client is None:
        raise RuntimeError("El cliente HTTP no ha sido inicializado en el estado de la aplicación.")
    return client