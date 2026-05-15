FROM python:3.11-slim

# Refs: services/tts/main.py — microservice TTS Holenek

# Dépendances système pour pydub (ffmpeg) et soundfile (libsndfile)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer les deps Python en couche cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code applicatif
COPY main.py .

# Volume pour le cache du modèle supertonic (évite le re-téléchargement à chaque démarrage)
ENV SUPERTONIC_CACHE_DIR=/cache
VOLUME ["/cache"]

EXPOSE 3002

# Healthcheck Docker — sert aussi pour orchestrer le démarrage de NestJS
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:3002/health').status==200 else 1)" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3002", "--log-level", "info"]
