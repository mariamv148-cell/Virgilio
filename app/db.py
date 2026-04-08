import psycopg
from app.config import settings

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    telegram_user TEXT,
    message_text TEXT NOT NULL,
    area TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    processed BOOLEAN DEFAULT FALSE,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE
);
"""


def init_db():
    with psycopg.connect(settings.database_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
            cur.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE")
            cur.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE")
            print("✅ Base de datos inicializada")


def save_message(telegram_user: str, message_text: str):
    with psycopg.connect(settings.database_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO tasks (telegram_user, message_text, processed) VALUES (%s, %s, FALSE)",
                (telegram_user, message_text),
            )


def get_unprocessed_messages():
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, telegram_user, message_text, created_at FROM tasks WHERE processed = FALSE ORDER BY created_at ASC"
            )
            return cur.fetchall()


def mark_message_processed(task_id: int, area: str):
    with psycopg.connect(settings.database_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE tasks SET area = %s, processed = TRUE WHERE id = %s",
                (area, task_id),
            )


def mark_task_completed(task_id: int):
    with psycopg.connect(settings.database_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE tasks SET completed = TRUE, completed_at = now(), processed = TRUE WHERE id = %s",
                (task_id,),
            )


def get_processed_tasks():
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, telegram_user, message_text, area, created_at, completed, completed_at FROM tasks WHERE processed = TRUE ORDER BY completed, created_at DESC"
            )
            rows = cur.fetchall()
            return [
                {
                    "id": row[0],
                    "telegram_user": row[1],
                    "message_text": row[2],
                    "area": row[3],
                    "created_at": row[4].isoformat() if row[4] else None,
                    "completed": row[5],
                    "completed_at": row[6].isoformat() if row[6] else None,
                }
                for row in rows
            ]


def get_completed_tasks():
    with psycopg.connect(settings.database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, telegram_user, message_text, area, created_at, completed_at FROM tasks WHERE completed = TRUE ORDER BY completed_at DESC"
            )
            rows = cur.fetchall()
            return [
                {
                    "id": row[0],
                    "telegram_user": row[1],
                    "message_text": row[2],
                    "area": row[3],
                    "created_at": row[4].isoformat() if row[4] else None,
                    "completed_at": row[5].isoformat() if row[5] else None,
                }
                for row in rows
            ]
