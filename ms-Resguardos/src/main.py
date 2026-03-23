import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import engine, Base
from src.routers import asignaciones

app = FastAPI(title="Microservicio Resguardos")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(asignaciones.router)

@app.on_event("startup")
async def startup_event():
    print("📍 Conectando a BD Resguardos...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

#if __name__ == "__main__":
#    host = os.getenv("API_HOST", "0.0.0.0")
#    port = int(os.getenv("API_PORT", "8000"))
#    uvicorn.run("src.main:app", host=host, port=port, reload=True)