from app.config import settings
from app.db import init_db
from app.web import app as web_app
import uvicorn

if __name__ == "__main__":
    init_db()
    print("🌐 Dashboard Virgilio en http://localhost:8000")
    uvicorn.run(web_app, host=settings.app_host, port=settings.app_port)