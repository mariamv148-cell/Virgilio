import asyncio
from telegram import Update, BotCommand
from telegram.ext import ApplicationBuilder, ContextTypes, CommandHandler, MessageHandler, filters
from app.config import settings
from app.classifier import classify_text
from app.db import save_message, get_unprocessed_messages, mark_message_processed, mark_task_completed
from app.web import broadcast_update


def build_bot():
    application = ApplicationBuilder().token(settings.telegram_token).build()

    async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text(
            "Hola, soy Virgilio. Envíame tareas o ideas y las guardaré en tu inbox. Usa /sync para procesar el inbox, /done <id> para completar tareas y /remind <minutos> <nota> para recordatorios."
        )

    async def sync(update: Update, context: ContextTypes.DEFAULT_TYPE):
        pending = get_unprocessed_messages()
        if not pending:
            await update.message.reply_text("✅ No hay mensajes nuevos en el inbox.")
            return

        processed_count = 0
        for task_id, telegram_user, message_text, created_at in pending:
            area = classify_text(message_text)
            mark_message_processed(task_id, area)
            processed_count += 1

        await update.message.reply_text(
            f"🔄 Inbox procesado. Se clasificaron {processed_count} mensaje(s)."
        )

        try:
            asyncio.create_task(broadcast_update(f"Se procesaron {processed_count} nuevos mensajes."))
        except Exception:
            pass

    async def wrap(update: Update, context: ContextTypes.DEFAULT_TYPE):
        await update.message.reply_text(
            "✅ Cierre del día registrado. Revisa tu dashboard y comienza mañana con claridad."
        )

    async def done(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not context.args:
            await update.message.reply_text("Usa /done <id>. Ejemplo: /done 12")
            return

        try:
            task_id = int(context.args[0])
        except ValueError:
            await update.message.reply_text("El id debe ser un número. Usa /done <id>.")
            return

        mark_task_completed(task_id)
        await update.message.reply_text(f"✅ Tarea {task_id} marcada como completada y archivada.")

        try:
            asyncio.create_task(broadcast_update(f"Tarea {task_id} completada."))
        except Exception:
            pass

    async def remind(update: Update, context: ContextTypes.DEFAULT_TYPE):
        if len(context.args) < 2:
            await update.message.reply_text("Usa /remind <minutos> <mensaje>. Ejemplo: /remind 30 Revisar pipeline.")
            return

        try:
            minutes = int(context.args[0])
        except ValueError:
            await update.message.reply_text("El primer valor debe ser un número de minutos.")
            return

        reminder_text = " ".join(context.args[1:])
        if minutes <= 0:
            await update.message.reply_text("Debe ser un número mayor que 0.")
            return

        context.job_queue.run_once(set_reminder, minutes * 60, data={"chat_id": update.effective_chat.id, "text": reminder_text})
        await update.message.reply_text(f"⏰ Te recordaré en {minutes} minutos: {reminder_text}")

    async def set_reminder(context: ContextTypes.DEFAULT_TYPE):
        job = context.job
        data = job.data
        await context.bot.send_message(chat_id=data["chat_id"], text=f"⏰ Recordatorio: {data['text']}")

    async def capture(update: Update, context: ContextTypes.DEFAULT_TYPE):
        message_text = update.message.text.strip()
        save_message(str(update.message.from_user.id), message_text)
        await update.message.reply_text(
            "✉️ Mensaje enviado al inbox. Usa /sync para clasificarlo y verlo en el dashboard."
        )

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("sync", sync))
    application.add_handler(CommandHandler("wrap", wrap))
    application.add_handler(CommandHandler("done", done))
    application.add_handler(CommandHandler("remind", remind))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, capture))

    loop = asyncio.get_event_loop()
    loop.run_until_complete(application.bot.set_my_commands([
        BotCommand("start", "Iniciar briefing del día"),
        BotCommand("sync", "Procesar el inbox"),
        BotCommand("wrap", "Cerrar el día"),
        BotCommand("done", "Marcar tarea completada por id"),
        BotCommand("remind", "Programar un recordatorio")
    ]))

    return application
