# STT Project — Sinhala Voice Capturing System

An AI-based Speech-to-Text application for Sinhala and English audio (Tamil optional),
built to satisfy the tender specification in *Annexure 2 — Specification for Voice
Capturing System* (Commission client, Sri Lanka).

## What the system must do (one paragraph)

Ingest audio/video files (MP3, WAV, MP4, M4A), transcribe Sinhala/English speech —
including code-switched "Singlish" — at ≥90% accuracy, with word-level time alignment,
automatic speaker diarization, and an editor that lets reviewers play audio against the
transcript and correct text and speaker labels. Output exports to DOCX, PDF, and TXT
with correct Sinhala/Tamil Unicode. Everything runs inside client-approved jurisdiction
(on-premises capable), with RBAC, data classification tiers, immutable audit logging,
AES-256 at rest, and TLS 1.2+ in transit. Client data must never be used for model
training.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/01-requirements.md](docs/01-requirements.md) | The full spec distilled into build items, disclosure items, and process items |
| [docs/02-architecture.md](docs/02-architecture.md) | Proposed system architecture and technology choices |
| [docs/03-roadmap.md](docs/03-roadmap.md) | Phased delivery plan with the accuracy-risk work front-loaded |

## The three hardest requirements (read these first)

1. **≥90% accuracy on Sinhala with code-switching (2.2, 3.2)** — no off-the-shelf model
   guarantees this today. It requires fine-tuning an open ASR model on Sinhala and
   code-switched data plus a domain-specific evaluation set. This is the project's main
   technical risk and is front-loaded in the roadmap.
2. **Data sovereignty (6.9–6.12)** — rules out cloud transcription APIs (OpenAI, Google,
   Azure hosted abroad). The ASR stack must be fully self-hostable.
3. **Raw as-spoken transcripts (3.3)** — the model must emit Sinhala script for Sinhala
   speech and Latin script for English speech in the same utterance, without normalizing
   to one language. This constrains model and tokenizer choice from day one.
