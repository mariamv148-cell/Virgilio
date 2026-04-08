from dataclasses import dataclass

@dataclass
class Task:
    id: int
    telegram_user: str
    message_text: str
    area: str
    created_at: str
