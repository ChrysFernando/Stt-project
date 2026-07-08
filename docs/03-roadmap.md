# Delivery Roadmap

Ordered so the highest-risk item — Sinhala/code-switch accuracy (2.2, 3.2) — is proven
or disproven before heavy product investment. Each phase ends with something
demonstrable.

## Phase 0 — Feasibility spike: can we hit the accuracy bar? (2–4 weeks)

The go/no-go phase. No UI, no auth — just the ASR question.

- [ ] Assemble an evaluation set: ≥2 h of representative Sinhala, English, and
      code-switched audio with verbatim ground-truth transcripts (raw as-spoken, 3.3).
- [ ] Stand up a GPU box; benchmark Whisper large-v3 zero-shot; record CER/WER per
      condition.
- [ ] Fine-tune on OpenSLR SLR52 + Common Voice Sinhala; re-benchmark.
- [ ] Test raw as-spoken output on code-switched clips (Sinhala script + Latin script in
      one utterance).
- [ ] Decision: gap to ≤10% CER/WER, and the data-collection budget needed to close it.

**Exit criterion:** a written accuracy report — this also seeds the bid's compliance
answer for 2.2.

## Phase 1 — Pipeline MVP (4–6 weeks)

End-to-end transcription with no product shell.

- [ ] FFmpeg ingestion for MP3/WAV/MP4/M4A → normalized audio (2.1)
- [ ] Queue-based transcription jobs (upload → job → result)
- [ ] Forced alignment for word-level timestamps (2.3)
- [ ] Diarization merged into the transcript (4.1)
- [ ] Raw as-spoken transcript stored as canonical, segments tagged by language (3.3)
- [ ] TXT export with correct Unicode (first slice of 4.3/3.4)
- [ ] Record per-job runtime/VRAM/storage — feeds max-file-size disclosure (2.4) and
      hardware sizing (7.2)

**Demo:** drop in an MP4, get back a time-aligned, speaker-separated transcript.

## Phase 2 — Reviewer product (6–8 weeks)

The part users touch; where 90% ASR becomes a 100% record.

- [ ] Web app: upload, job status, transcript list
- [ ] Transcript editor: audio player synced to segments, click-to-seek, inline text
      editing, keyboard-driven playback (2.3)
- [ ] Speaker rename + segment reassignment (4.2)
- [ ] DOCX and PDF export with embedded Sinhala/Tamil-capable fonts; verify rendering in
      Microsoft Word (4.3, 4.4, 3.4)
- [ ] Full-text transcript search (section 5 heading)

**Demo:** a clerk corrects a transcript end-to-end and exports a DOCX.

## Phase 3 — Enterprise hardening (6–8 weeks)

Everything section 5 and 6 demand.

- [ ] Auth + admin: account lifecycle (5.1), custom roles with granular permissions
      (5.2, 6.1), password policy / session timeout / concurrent-login limits (5.3)
- [ ] Classification tiers on assets and transcripts, enforced and filterable (6.2)
- [ ] Append-only audit log covering login/view/edit/delete/export (6.3)
- [ ] Encryption at rest with documented key management (6.4); TLS everywhere (6.5)
- [ ] Deployment topology with network isolation: reverse proxy in DMZ, private subnet
      for DB/inference; reference firewall rules (6.6, 7.3)
- [ ] Zero outbound telemetry verified (supports 6.9, 6.12)

**Demo:** admin creates a custom role; a restricted user cannot see Confidential items;
every action shows in the audit trail.

## Phase 4 — Deployment package & tender documents (3–4 weeks, overlaps Phase 3)

The DISCLOSE items, generated from what was actually built and measured.

- [ ] Docker Compose on-prem install guide + cloud/hybrid variant (7.1, 8.1)
- [ ] Hardware sizing sheet from Phase 1 benchmarks (7.2); facility notes (7.4)
- [ ] Network/ports document (7.3); storage-sites disclosure (6.10)
- [ ] Data-flow diagrams + sovereignty justification (8.1, 8.2)
- [ ] SBOM / sub-processor & model-license inventory (8.3)
- [ ] Incident-response playbook (6.8); ops runbook & staffing profile (7.5)
- [ ] Client-side infrastructure cost sheet (7.6)
- [ ] Max file size/duration statement from load tests (2.4)

## Phase 5 — VAPT, UAT, training, handover (4–6 weeks)

- [ ] Third-party VAPT; remediate; schedule annual repeat (6.7)
- [ ] Scripted UAT against every BUILD item in docs/01-requirements.md (8.4)
- [ ] Admin training + end-user onboarding materials and sessions (8.5, 8.6)
- [ ] 1-year helpdesk/SLA arrangement in place (8.7)

## Deferred / optional

- **Tamil support (3.1, 3.4):** design keeps it additive — a further fine-tune plus
  export-font coverage. Bid it as a priced option.
- **Native desktop client (1.2):** ship the web app first; wrap with Tauri/Electron only
  if the client insists "natively" means an installed .exe.

## Standing risks

| Risk | Mitigation |
|------|-----------|
| Code-switched Sinhala data scarcity | Phase 0 sizes the gap early; budget a recording/annotation effort; the editor keeps the product useful while accuracy improves |
| "90% accuracy" ambiguity in contract | Propose the metric definition (CER/WER, "normal speaking conditions") in the bid before signing |
| GPU procurement lead time in Sri Lanka | Order at Phase 0; a single 24 GB-class GPU covers pilot scale |
| Audit/compliance scope creep | Audit logging and RBAC are designed in from Phase 1's data model, not bolted on |
