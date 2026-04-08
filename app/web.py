from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from app.db import get_processed_tasks, init_db

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Virgilio Dashboard", lifespan=lifespan)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

connected_websockets = []

@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    tasks = get_processed_tasks()
    return templates.TemplateResponse("dashboard.html", {"request": request, "tasks": tasks})

@app.get("/tasks", response_class=JSONResponse)
async def get_tasks():
    tasks = get_processed_tasks()
    return tasks

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)

    try:
        while True:
            await websocket.receive_text()
    except Exception:
        if websocket in connected_websockets:
            connected_websockets.remove(websocket)


async def broadcast_update(message: str):
    stale_connections = []
    for connection in connected_websockets:
        try:
            await connection.send_json({"type": "update", "message": message})
        except Exception:
            stale_connections.append(connection)

    for connection in stale_connections:
        if connection in connected_websockets:
            connected_websockets.remove(connection)
