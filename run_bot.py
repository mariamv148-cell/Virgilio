from app.bot import build_bot

if __name__ == "__main__":
    bot_app = build_bot()
    print("🤖 Iniciando Virgilio Bot de Telegram...")
    bot_app.run_polling(stop_signals=None)
