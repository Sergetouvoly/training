# Service TTS — Holenek

Microservice Python FastAPI pour la synthèse vocale via [supertonic](https://github.com/supertonic-ai/supertonic).

## Endpoint

### `POST /synthesize`

**Headers**
- `X-Shared-Secret: <secret>` — obligatoire, doit matcher `TTS_SHARED_SECRET` côté serveur.

**Body JSON**
```json
{
  "text": "Bonjour, ceci est un module de formation…",
  "lang": "fr",
  "voice": "M1",
  "silence_duration": 0.3,
  "max_chunk_length": 300
}
```

Langues supportées : `fr`, `en`, `ko`, `ja`.

**Réponse**
- `200 OK` — `audio/mpeg` (binaire MP3, 96 kbps)
- Header `X-Duration-Seconds` — durée audio totale
- Header `X-Synthesis-Time` — temps de génération côté serveur

**Erreurs**
- `401` — secret manquant ou invalide
- `500` — synthèse échouée, conversion MP3 échouée

### `GET /health`

Liveness probe (pas d'auth). Retourne `{ status: "ok", model_loaded: bool }`.

## Démarrage local (hors Docker)

```bash
cd services/tts
python -m venv .venv
.venv/Scripts/activate    # Windows
pip install -r requirements.txt

export TTS_SHARED_SECRET=dev-secret
uvicorn main:app --host 0.0.0.0 --port 3002
```

> Le premier démarrage télécharge le modèle supertonic (~quelques centaines de Mo).

## Démarrage Docker

Géré par `docker/docker-compose.yml`. Voir `.env.example` à la racine pour la variable `TTS_SHARED_SECRET`.

```bash
docker compose -f docker/docker-compose.yml up tts -d
docker compose -f docker/docker-compose.yml logs -f tts
```

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `TTS_SHARED_SECRET` | — | **Obligatoire.** Clé partagée avec NestJS pour l'authentification. |
| `TTS_MAX_TEXT_LENGTH` | `50000` | Longueur max du texte accepté (caractères). |
| `SUPERTONIC_CACHE_DIR` | `/cache` (Docker) | Répertoire de cache du modèle. Persistant via volume Docker. |

## Performances

- ~10-30s de génération pour 500-2000 mots (CPU). Avec GPU : nettement plus rapide si supertonic le détecte.
- Le modèle reste en RAM entre requêtes (lazy-init partagé).
- Sortie : MP3 96 kbps — ~700 Ko par minute d'audio.
