# VoiceScript backend

Express server that accepts audio uploads (MP3, WAV, MP4, M4A), transcribes them
with the ElevenLabs Scribe speech-to-text API (Sinhala + English, speaker
diarization, word timestamps), and serves transcripts to the frontend.

## Run

```bash
cd backend
npm install
cp .env.example .env    # then paste your ElevenLabs API key into .env
npm start               # http://localhost:8000
```

Run the frontend in a second terminal (`cd frontend && npm run dev`) — the Vite
dev server proxies `/api` to this backend, and the app switches from demo mode
to live mode automatically.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness + whether the STT key is configured |
| POST | `/api/transcriptions` | Multipart upload (`file`, optional `classification`); returns the job, transcribes in background |
| GET | `/api/transcriptions` | List jobs |
| GET | `/api/transcriptions/:id` | One job with segments |
| GET | `/api/transcriptions/:id/audio` | Stream the original audio |
| PUT | `/api/transcriptions/:id` | Save edited segments / classification |
| DELETE | `/api/transcriptions/:id` | Remove a job and its audio |

Storage is a JSON file plus an uploads folder under `backend/data/` — deliberately
simple for this stage; swapping in PostgreSQL later only touches this file.

Note: ElevenLabs is a cloud API, which is ideal for developing and demonstrating
the product. The tender's data-sovereignty clause (6.9) may require a self-hosted
model for production — the API surface here stays the same either way.
