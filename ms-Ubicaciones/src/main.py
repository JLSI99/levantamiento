import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.database import engine, Base
from src.routers import ubicaciones, departamentos, tipos_bien 

app = FastAPI(title="Microservicio Ubicaciones")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ubicaciones.router)
app.include_router(departamentos.router)
app.include_router(tipos_bien.router)

@app.on_event("startup")
async def startup_event():
    print("📚 Conectando a BD Catálogo...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas de Catálogo listas.")

#if __name__ == "__main__":
#    host = os.getenv("API_HOST", "0.0.0.0")
#    port = int(os.getenv("API_PORT", "8000"))
#    uvicorn.run("src.main:app", host=host, port=port, reload=True)