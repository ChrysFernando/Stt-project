# Requirements Breakdown

Source: *Annexure 2 — Specification for Voice Capturing System*.

Every line in the spec falls into one of three categories. Knowing which is which keeps
engineering focused on what must actually be built:

- **BUILD** — software capability that must exist and be demonstrable in UAT.
- **DISCLOSE** — a document the vendor must produce (sizing, costs, architecture).
- **PROCESS** — an activity or contractual commitment (VAPT, training, SLA).

## 1. General System & Platform

| Ref | Requirement | Category | Engineering interpretation |
|-----|-------------|----------|---------------------------|
| 1.1 | AI speech-to-text optimized for Sinhala | BUILD | Core ASR pipeline, Sinhala-first |
| 1.2 | Native Windows 10/11 (64-bit) support | BUILD | Client must run on Windows. A browser-based UI reached from Windows satisfies most tenders, but "natively" suggests offering a desktop client too — clarify with the client; plan for a web UI plus an optional packaged desktop shell |
| 1.3 | Single-user or enterprise licensing | PROCESS | Licensing terms in the offer; technically, per-seat account limits |
| 1.4 | Brand | DISCLOSE | Name the product in the bid |

## 2. Transcription Core

| Ref | Requirement | Category | Engineering interpretation |
|-----|-------------|----------|---------------------------|
| 2.1 | Ingest MP3, WAV, MP4, M4A via manual upload | BUILD | FFmpeg-based ingestion; normalize everything to 16 kHz mono WAV internally |
| 2.2 | ≥90% accuracy, normal conditions | BUILD | Define the metric now: ≤10% WER for English, ≤10% CER (character error rate) for Sinhala — word-level WER is unstable for Sinhala morphology. Build a held-out domain test set and measure continuously |
| 2.3 | Time-alignment between text and audio | BUILD | Word/segment timestamps; editor with click-to-seek playback |
| 2.4 | State max file size / duration | DISCLOSE | Pick and document limits (e.g. 2 GB / 4 h per file) after load testing |

## 3. Multilingual, Code-Switching & Unicode

| Ref | Requirement | Category | Engineering interpretation |
|-----|-------------|----------|---------------------------|
| 3.1 | Sinhala + English (Tamil optional, preferred) | BUILD | Sinhala/English mandatory; design so Tamil is an additive model/language pack, not a rewrite |
| 3.2 | Code-switching within one session | BUILD | The model must not force per-file language selection; needs code-switched training/eval data |
| 3.3 | Raw as-spoken transcript variant | BUILD | Preserve original script per language; no translation/transliteration. Store the raw transcript as the canonical record; any normalized variant is derived |
| 3.4 | Sinhala, English, Tamil Unicode in all outputs | BUILD | UTF-8 end to end; embed Unicode fonts (e.g. Noto Sans Sinhala/Tamil) in PDF export; verify DOCX rendering in Microsoft Word |

## 4. Editing & Document Management

| Ref | Requirement | Category | Engineering interpretation |
|-----|-------------|----------|---------------------------|
| 4.1 | Automatic speaker diarization | BUILD | Diarization stage (e.g. pyannote) merged with ASR segments; speakers labeled S1, S2, … |
| 4.2 | Manual speaker re-labeling | BUILD | Editor supports renaming a speaker globally and reassigning individual segments |
| 4.3 | Export DOCX, PDF, TXT | BUILD | Server-side export with speaker labels and optional timestamps |
| 4.4 | Interoperability with Word/Notepad/Office | BUILD | Satisfied by clean DOCX/TXT export — no plugin required; state this in the compliance response |

## 5. Search, Retrieval & User Management

| Ref | Requirement | Category | Engineering interpretation |
|-----|-------------|----------|---------------------------|
| 5.1 | Admin account management | BUILD | Create / modify / deactivate users; admin UI |
| 5.2 | Custom roles + granular permissions | BUILD | RBAC with permission flags (upload, transcribe, edit, export, admin, audit-view) composable into custom roles — not just fixed roles |
| 5.3 | Password policy, session timeout, concurrent-login limits | BUILD | All three configurable by the admin |

(The section heading implies search; add full-text transcript search with Sinhala/Tamil
support — it is cheap with PostgreSQL and will score well even though no numbered line
demands it.)

## 6. Security, Compliance & Data Sovereignty

| Ref | Requirement | Category | Engineering interpretation |
|-----|-------------|----------|---------------------------|
| 6.1 | RBAC over confidential legal text | BUILD | Same RBAC engine as 5.2; enforce on every API route |
| 6.2 | Classification tiers (Public/Restricted/Confidential) | BUILD | Classification label on each transcript/audio record; filterable; role-gated access per tier |
| 6.3 | Unalterable full audit logs | BUILD | Append-only audit store (logins, views, edits, deletes, exports); no delete/update path; consider hash-chaining entries |
| 6.4 | AES-256 at rest + key management | BUILD | Full-disk or database/file-store encryption; documented key rotation; keys separate from data |
| 6.5 | TLS 1.2+ in transit | BUILD | TLS 1.2 minimum, prefer 1.3; internal service traffic included |
| 6.6 | Network isolation of backend | BUILD/DISCLOSE | DB + GPU inference on private subnet; only the reverse proxy exposed; ship a reference firewall config |
| 6.7 | VAPT before deployment + annually | PROCESS | Budget for a third-party VAPT engagement |
| 6.8 | Incident response playbook | DISCLOSE | Written playbook deliverable |
| 6.9 | Data resides in approved jurisdiction | BUILD | **Architecture-defining**: fully self-hostable stack, no foreign cloud APIs; on-prem is the safe default answer |
| 6.10 | Storage site disclosure | DISCLOSE | Document every place data lives (DB, object store, backups, temp files, logs) |
| 6.11 | Client owns all data | PROCESS | Contract term; also build full data export/handover tooling |
| 6.12 | No AI training on client data | PROCESS/BUILD | Contract term; technically, no telemetry or sample collection by default. Fine-tuning on client audio would require explicit written consent — plan accuracy work around public/purchased data instead |

## 7. Resilience, Performance & Infrastructure

| Ref | Requirement | Category | Engineering interpretation |
|-----|-------------|----------|---------------------------|
| 7.1 | On-prem, cloud, or hybrid deployment | BUILD | Containerized (Docker Compose / K8s) so the same stack deploys anywhere |
| 7.2 | Hardware requirements list | DISCLOSE | Publish a sizing sheet (GPU, RAM, storage per audio-hour, DB) once benchmarked |
| 7.3 | Ports / firewall rules | DISCLOSE | Network requirements document |
| 7.4 | Data-center prerequisites | DISCLOSE | Rack/power/cooling for the GPU server, if on-prem |
| 7.5 | Client staffing needs | DISCLOSE | Ops runbook + admin profile description |
| 7.6 | Itemized client-side infra costs | DISCLOSE | Cost sheet separate from license fees |

## 8. Deployment, Training & Lifecycle

| Ref | Requirement | Category |
|-----|-------------|----------|
| 8.1 | Deployment design + data-flow diagrams | DISCLOSE |
| 8.2 | Sovereignty alignment justification | DISCLOSE |
| 8.3 | Sub-processor / third-party component list | DISCLOSE (maintain an SBOM + model/license inventory from day one) |
| 8.4 | Formal documented UAT | PROCESS (write UAT scripts against the BUILD items above) |
| 8.5 | Admin training | PROCESS |
| 8.6 | End-user onboarding | PROCESS |
| 8.7 | ≥1-year vendor helpdesk SLA | PROCESS |

## Summary counts

- **BUILD items:** ~22 — the software scope.
- **DISCLOSE items:** ~12 — documents that should be generated from real benchmarks and
  the real architecture, so start the docs as the system is built, not at bid time.
- **PROCESS items:** ~8 — contractual/service commitments to price into the offer.
