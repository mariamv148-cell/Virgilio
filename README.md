# Virgilio

Virgilio es un sistema personal de productividad que captura tareas desde Telegram, clasifica por áreas de vida, guarda todo en PostgreSQL y ofrece un dashboard web.

## Qué incluye este esqueleto

- Bot de Telegram en Python
- Clases básicas para clasificación con Claude API
- Almacenamiento en PostgreSQL
- Dashboard web con FastAPI
- Comandos iniciales: `/start`, `/sync`, `/wrap`

## Áreas de vida

1. Trabajo — GeoVictoria
2. Trabajo secundario o proyecto personal — Partnea
3. Salud y bienestar
4. Aprendizaje
5. Familia y relaciones
6. Finanzas

## Requisitos

- Python 3.11+
- PostgreSQL
- Cuenta de Railway para despliegue
- Token de Telegram
- Claude API key

## Configuración local

1. Copia `.env.example` a `.env`
2. Rellena `DATABASE_URL`, `TELEGRAM_TOKEN`, `CLAUDE_API_KEY`, `APP_HOST` y `APP_PORT`
3. Instala dependencias:

```bash
python3 -m pip install -r requirements.txt
```

4. Inicializa la base de datos:

```bash
python3 app/db.py
```

5. Ejecuta el proyecto:

```bash
python3 run.py
```

## Notas

Este esqueleto está diseñado como punto de partida. El siguiente paso es conectar el bot con Telegram, validar los comandos y ajustar la clasificación inteligente.

## Publicación / Despliegue

Para publicar Virgilio en un servicio como Railway o Heroku, usa dos procesos separados:

- `web`: ejecuta el dashboard web
- `worker`: ejecuta el bot de Telegram

### Archivos necesarios

- `Procfile`:
  ```text
  web: uvicorn app.web:app --host 0.0.0.0 --port ${PORT:-8000}
  worker: python run_bot.py
  ```

### Variables de entorno

Configura estas variables en tu plataforma:

- `DATABASE_URL`
- `TELEGRAM_TOKEN`
- `CLAUDE_API_KEY`
- `APP_HOST=0.0.0.0`
- `APP_PORT=8000`

En plataformas como Railway, `PORT` se asigna automáticamente y `app/config.py` la usa si `APP_PORT` no está definida.

### Comandos de inicio local

- Dashboard: `python3 run_web.py`
- Bot: `python3 run_bot.py`

### Nota de producción

No uses `run.py` en despliegue. Ese archivo une bot y web en el mismo proceso local, pero para publicación es más robusto ejecutar `run_web.py` y `run_bot.py` por separado.
