"""Microservice TTS — synthèse vocale via supertonic, conversion WAV → MP3.

Ref: dev_idea.txt — TTS pour modules e-learning Holenek.
Auth via X-Shared-Secret (clé partagée avec NestJS).
"""
from __future__ import annotations

import io
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Literal, Optional

import numpy as np
import soundfile as sf  # supertonic dep
from fastapi import FastAPI, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("tts")

SHARED_SECRET = os.environ.get("TTS_SHARED_SECRET", "")
MAX_TEXT_LENGTH = int(os.environ.get("TTS_MAX_TEXT_LENGTH", "50000"))

# ── Modèle TTS global (chargé au démarrage, partagé entre requêtes) ──────────

_tts_instance = None


def get_tts():
    """Lazy-init du modèle supertonic. Téléchargement automatique au 1er appel."""
    global _tts_instance
    if _tts_instance is None:
        log.info("Chargement du modèle supertonic (premier appel)…")
        from supertonic import TTS
        _tts_instance = TTS(auto_download=True)
        log.info("Modèle supertonic prêt.")
    return _tts_instance


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Pré-charge le modèle au démarrage pour éviter le coût sur la 1re requête
    try:
        get_tts()
    except Exception as e:
        log.warning("Pré-chargement TTS échoué (sera réessayé à la 1re requête) : %s", e)
    yield


app = FastAPI(title="Holenek TTS", version="1.0", lifespan=lifespan)


# ── Schémas ──────────────────────────────────────────────────────────────────

LangCode = Literal["fr", "en", "ko", "ja"]


class SynthesizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_TEXT_LENGTH)
    lang: LangCode = "fr"
    voice: str = "M1"
    silence_duration: float = Field(0.3, ge=0.0, le=3.0)
    max_chunk_length: int = Field(300, ge=50, le=1000)


# ── Auth helper ──────────────────────────────────────────────────────────────


def check_secret(provided: Optional[str]) -> None:
    if not SHARED_SECRET:
        raise HTTPException(500, "TTS_SHARED_SECRET not configured server-side")
    if not provided or provided != SHARED_SECRET:
        raise HTTPException(401, "Invalid shared secret")


# ── Routes ───────────────────────────────────────────────────────────────────


@app.get("/health")
def health():
    """Liveness probe — pas d'auth."""
    return {"status": "ok", "model_loaded": _tts_instance is not None}


@app.post("/synthesize")
def synthesize(
    payload: SynthesizeRequest,
    x_shared_secret: Optional[str] = Header(default=None, alias="X-Shared-Secret"),
):
    """Synthèse texte → MP3 via supertonic + pydub."""
    check_secret(x_shared_secret)

    started = time.monotonic()
    log.info("Synthèse demandée : lang=%s voice=%s text_length=%d",
             payload.lang, payload.voice, len(payload.text))

    try:
        tts = get_tts()
        style = tts.get_voice_style(voice_name=payload.voice)
        wav_array, duration = tts.synthesize(
            payload.text,
            voice_style=style,
            lang=payload.lang,
            max_chunk_length=payload.max_chunk_length,
            silence_duration=payload.silence_duration,
        )
        # duration retourné par supertonic est un np.ndarray
        total_duration = float(np.sum(duration)) if isinstance(duration, np.ndarray) else float(duration)
    except Exception as e:
        log.exception("Erreur synthèse")
        raise HTTPException(500, f"TTS synthesis failed: {e}")

    # ── Conversion WAV → MP3 via pydub (ffmpeg) ──────────────────────────────
    try:
        wav_buffer = io.BytesIO()
        # supertonic donne un float32 mono 24kHz typiquement
        sample_rate = getattr(tts, "sample_rate", 24000)
        sf.write(wav_buffer, wav_array, sample_rate, format="WAV", subtype="PCM_16")
        wav_buffer.seek(0)

        from pydub import AudioSegment
        seg = AudioSegment.from_file(wav_buffer, format="wav")
        mp3_buffer = io.BytesIO()
        seg.export(mp3_buffer, format="mp3", bitrate="96k")
        mp3_bytes = mp3_buffer.getvalue()
    except Exception as e:
        log.exception("Erreur conversion MP3")
        raise HTTPException(500, f"MP3 conversion failed: {e}")

    elapsed = time.monotonic() - started
    log.info("Synthèse OK en %.2fs (duration audio=%.2fs, %d bytes)",
             elapsed, total_duration, len(mp3_bytes))

    return Response(
        content=mp3_bytes,
        media_type="audio/mpeg",
        headers={
            "X-Duration-Seconds": f"{total_duration:.2f}",
            "X-Synthesis-Time": f"{elapsed:.2f}",
        },
    )
