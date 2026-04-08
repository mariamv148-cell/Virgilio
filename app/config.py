import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Settings:
    database_url: str = os.getenv("DATABASE_URL", "postgresql://localhost/virgilio_db")
    telegram_token: str = os.getenv("TELEGRAM_TOKEN", "")
    claude_api_key: str = os.getenv("CLAUDE_API_KEY", "")
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", os.getenv("PORT", 8000)))
    areas_of_life = [
        "Trabajo — GeoVictoria",
        "Trabajo secundario o proyecto personal — Partnea",
        "Salud y bienestar",
        "Aprendizaje",
        "Familia y relaciones",
        "Finanzas",
    ]

settings = Settings()
