import asyncio
import threading
import sys
from app.bot import build_bot
from app.config import settings
from app.db import init_db
from app.web import app as web_app
import uvicorn

bot_ready = threading.Event()


def start_web():
    uvicorn.run(web_app, host=settings.app_host, port=settings.app_port)


def start_bot():
    asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    bot_app = build_bot()
    bot_ready.set()
    bot_app.run_polling(stop_signals=None)


if __name__ == "__main__":
    init_db()
    print("🚀 Iniciando Virgilio...")
    print("📱 Bot de Telegram listo")
    print(f"🌐 Dashboard en http://{settings.app_host}:{settings.app_port}")

    bot_thread = threading.Thread(target=start_bot, daemon=True)
    bot_thread.start()
    if not bot_ready.wait(timeout=10):
        print("⚠️ Bot startup timed out, aborting web server startup.", file=sys.stderr)
        sys.exit(1)

    start_web()
