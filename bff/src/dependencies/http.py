from fastapi import Request
import httpx

def get_http_client(request:Request)->httpx.AsyncClient:
    client=getattr(request.app.state, "http_client",None)
    if not client:
        raise RuntimeError(
            "Falla de Infraestructura: el cliente HTTP asíncrono no fue inicializado en el estado de FastAPI"
        )
    return client