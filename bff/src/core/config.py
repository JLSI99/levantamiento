from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ms_auth_url: str
    ms_personas_url: str
    ms_ubicaciones_url: str
    ms_bienes_url: str
    ms_resguardos_url: str

    class Config:
        env_file = ".env"

settings = Settings()