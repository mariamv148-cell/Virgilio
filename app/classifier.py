import requests
from app.config import settings

CLAUDE_API_URL = "https://api.anthropic.com/v1/complete"


def simple_classifier(text: str) -> str:
    normalized = text.lower()
    if any(word in normalized for word in ["proyecto", "meta", "negocio", "geo", "trabajo"]):
        return settings.areas_of_life[0]
    if any(word in normalized for word in ["side", "secundario", "partnea", "personal", "startup", "proyecto personal"]):
        return settings.areas_of_life[1]
    if any(word in normalized for word in ["gym", "salud", "ejercicio", "meditar", "bienestar", "correr"]):
        return settings.areas_of_life[2]
    if any(word in normalized for word in ["leer", "curso", "estudiar", "aprender", "tutorial"]):
        return settings.areas_of_life[3]
    if any(word in normalized for word in ["familia", "papá", "mamá", "pareja", "amistad", "hijos"]):
        return settings.areas_of_life[4]
    if any(word in normalized for word in ["dinero", "presupuesto", "finanzas", "ahorrar", "pago", "factura"]):
        return settings.areas_of_life[5]
    return settings.areas_of_life[0]


def classify_text(text: str) -> str:
    if not settings.claude_api_key:
        return simple_classifier(text)

    prompt = (
        "Eres un asistente que clasifica tareas y notas en una sola de estas áreas de vida:\n"
        + "\n".join([f"- {area}" for area in settings.areas_of_life])
        + f"\n\nHuman: Clasifica el siguiente texto en una sola categoría:\n{text}\nAssistant:"
    )

    try:
        response = requests.post(
            CLAUDE_API_URL,
            headers={
                "Content-Type": "application/json",
                "X-API-Key": settings.claude_api_key,
            },
            json={
                "model": "claude-3.5-mini",
                "prompt": prompt,
                "max_tokens_to_sample": 60,
            },
            timeout=30,
        )
        response.raise_for_status()
        data = response.json()
        raw_text = data.get("completion", "").strip()
    except Exception:
        return simple_classifier(text)

    for area in settings.areas_of_life:
        if area.lower() in raw_text.lower():
            return area

    return simple_classifier(text)
