# Proposed Architecture

## Guiding constraints

Two spec lines dictate the architecture before any technology is chosen:

- **6.9 Data sovereignty** — transcript data, telemetry, and audio may not leave
  client-approved jurisdiction. Foreign SaaS transcription APIs are off the table.
  Everything must be self-hostable.
- **2.2 + 3.2 Accuracy on code-switched Sinhala** — requires owning the model
  (fine-tuning), not renting one.

Therefore: **an on-premises-first, containerized web application with a local GPU
inference service**, deployable identically to a sovereign cloud or hybrid setup (7.1).

## System overview

```
Windows 10/11 clients (browser, optionally packaged desktop shell)
        │  HTTPS (TLS 1.2+)
        ▼
┌─ DMZ ──────────────────────────────────────────────┐
│  Reverse proxy (nginx/Caddy) — the only exposed hop │
└─────────────────────────────────────────────────────┘
        │ private subnet (6.6)
        ▼
┌─ Application tier ─────────────────────────────────────────────┐
│  API + Web app        Auth/RBAC (5.x, 6.1)   Audit logger (6.3)│
│  Export service (DOCX/PDF/TXT)                Job queue        │
└────────────────────────────────────────────────────────────────┘
        │                               │
        ▼                               ▼
┌─ Data tier ─────────────┐   ┌─ Inference tier (GPU) ──────────┐
│ PostgreSQL (metadata,   │   │ 1. FFmpeg normalize → 16k mono  │
│  transcripts, audit,    │   │ 2. VAD + segmentation           │
│  full-text search)      │   │ 3. ASR: fine-tuned Whisper      │
│ Object store (MinIO)    │   │    (Sinhala/English/code-switch)│
│  for audio files        │   │ 4. Forced alignment (word times)│
│ Encrypted at rest (6.4) │   │ 5. Diarization (pyannote)       │
└─────────────────────────┘   │ 6. Merge → timed, speaker-      │
                              │    attributed transcript        │
                              └─────────────────────────────────┘
```

## Technology choices (all self-hostable, permissively licensed)

| Concern | Choice | Why |
|---------|--------|-----|
| ASR model | **Whisper large-v3 (or distil variant), fine-tuned** on Sinhala + code-switched data | Best open multilingual baseline that already knows Sinhala script and handles mixed language; fine-tuning is the proven path to the 90% bar. Fallbacks/alternatives to benchmark: Meta MMS, wav2vec2-XLS-R Sinhala fine-tunes |
| Alignment + timestamps | WhisperX-style forced alignment | Word-level timestamps for click-to-seek review (2.3) |
| Diarization | pyannote.audio | State of the art among self-hostable options (4.1) |
| Media ingestion | FFmpeg | Covers MP3/WAV/MP4/M4A and far more (2.1) |
| Backend | FastAPI (Python) | Same language as the ML stack; async job handling |
| Job queue | Redis + worker processes (e.g. Celery/RQ) | Long-running transcriptions must be queued, resumable, observable |
| Frontend | React web app; transcript editor with waveform/audio player synced to text | Editing + speaker relabeling (2.3, 4.2); package with Tauri/Electron later if a true desktop client is demanded (1.2) |
| Database | PostgreSQL | Transcripts, users, roles, classifications; built-in full-text search |
| Object storage | MinIO (or plain encrypted filesystem) | S3 API locally, keeps cloud/hybrid portability (7.1) |
| Export | python-docx / docx templates, WeasyPrint or LibreOffice headless for PDF with embedded Noto Sinhala/Tamil fonts | 4.3, 3.4 |
| Auth | Self-hosted OIDC (Keycloak) or in-app auth with argon2, configurable password policy, session timeout, concurrent-session limits | 5.1–5.3 |
| Audit | Append-only `audit_events` table written via a single code path; no UPDATE/DELETE grants; optional hash chain | 6.3 |
| Packaging | Docker Compose (single-server on-prem) with a Kubernetes path for scale | 7.1 |

## Data model (core records)

- **AudioAsset** — original file, checksum, duration, format, classification tier, owner.
- **TranscriptionJob** — status, model version, parameters, timings (feeds the sizing doc).
- **Transcript** — versioned; the *raw as-spoken* text is canonical (3.3). Segments carry
  `start_ms`, `end_ms`, `speaker_id`, `text`, `language_tag`.
- **Speaker** — per-transcript label, user-editable name (4.2).
- **AuditEvent** — actor, action, object, timestamp, IP; append-only (6.3).
- **User / Role / Permission** — custom roles composed from granular permissions (5.2).

## Security mapping

| Spec | Implementation |
|------|----------------|
| 6.4 encryption at rest | LUKS full-disk or MinIO SSE + PostgreSQL on encrypted volume; keys in a separate secrets store; documented rotation |
| 6.5 in transit | TLS 1.2+ at the proxy **and** between services |
| 6.6 isolation | Only the reverse proxy is routable from the user network; DB/inference on a private subnet with default-deny firewall |
| 6.2 classification | `classification` column enforced in the API's query layer; roles gate which tiers a user can list/open/export |
| 6.12 no training on client data | No outbound telemetry; model improvement pipeline consumes only public/licensed datasets unless the client signs off |

## Accuracy strategy (the make-or-break item)

1. **Evaluation first.** Build a held-out test set of genuine domain audio
   (commission-style hearings/meetings, consented or simulated): clean speech, noisy
   speech, heavy code-switching. Metric: CER for Sinhala, WER for English, reported per
   condition. "90% accuracy" is contractually vague — propose the definition in the bid.
2. **Baseline.** Benchmark Whisper large-v3 zero-shot; expect it to miss the bar on
   Sinhala, especially code-switched.
3. **Fine-tune.** Public Sinhala data to start: OpenSLR SLR52 (Sinhala ASR corpus),
   Mozilla Common Voice Sinhala, plus purchased/recorded code-switched "Singlish" data —
   code-switched data will be the scarce ingredient and likely needs a paid collection
   effort.
4. **Domain adaptation.** Legal/administrative vocabulary lists, prompt biasing or
   shallow-fusion language model for names and legal terms.
5. **Human-in-the-loop.** The editor is part of the accuracy story: fast correction with
   audio-synced playback is what makes 90% ASR usable at 100% for the final record.

## Sizing starting point (validate by benchmark, then publish for 7.2)

- 1× GPU server: 24 GB VRAM class GPU (e.g. L4/RTX 4090/A10), 64 GB RAM, 8+ cores —
  handles roughly real-time or faster transcription of one stream with large models;
  batch overnight jobs multiply throughput.
- 1× app/DB server or same box for small deployments: 32 GB RAM, SSD.
- Storage: ~1 GB per 10 audio-hours (compressed) plus DB growth; size by retention policy.
