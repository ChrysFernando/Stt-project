// Shared speech-to-text helpers for the Vercel serverless functions.
// Mirrors backend/elevenlabs.js (the long-running server variant).

const API_URL = 'https://api.elevenlabs.io/v1/speech-to-text'

const MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.m4a': 'audio/mp4',
  '.webm': 'audio/webm',
}

const MAX_GAP_SECONDS = 1.0
const MIN_SENTENCE_SECONDS = 3 // merge very short sentences with the next one
const PHRASE_GAP_SECONDS = 0.5 // breathing pause — split here when speech has no punctuation
const PHRASE_MIN_SECONDS = 4 // only use breathing pauses once the segment is this long
const MAX_SEGMENT_SECONDS = 18 // hard cap for run-on speech with no punctuation
const SENTENCE_END = /[.!?…។॥෴]["'»”’)]*$/

const SINHALA = /[඀-෿]/
const LATIN = /[A-Za-z]/

function langOf(text) {
  const si = SINHALA.test(text)
  const en = LATIN.test(text)
  if (si && en) return 'MIX'
  if (si) return 'SI'
  return 'EN'
}

function groupWords(words) {
  const segments = []
  const speakerLabels = new Map()
  let cur = null

  const flush = () => {
    if (!cur) return
    const text = cur.text.trim()
    if (text) {
      const conf = cur.logprobs.length
        ? Math.exp(cur.logprobs.reduce((a, b) => a + b, 0) / cur.logprobs.length)
        : null
      segments.push({
        id: segments.length + 1,
        start: Math.round(cur.start * 100) / 100,
        end: Math.round(cur.end * 100) / 100,
        speaker: cur.speaker,
        lang: langOf(text),
        conf: conf === null ? undefined : Math.round(conf * 100) / 100,
        text,
      })
    }
    cur = null
  }

  for (const w of words) {
    if (w.type === 'audio_event') continue
    if (w.type === 'word') {
      const rawSpeaker = w.speaker_id ?? 'speaker_0'
      if (!speakerLabels.has(rawSpeaker)) {
        speakerLabels.set(rawSpeaker, `Speaker ${speakerLabels.size + 1}`)
      }
      const speaker = speakerLabels.get(rawSpeaker)
      const speakerChanged = cur && cur.speaker !== speaker
      const bigGap = cur && w.start - cur.end > MAX_GAP_SECONDS
      const breathPause = cur && w.start - cur.end > PHRASE_GAP_SECONDS && cur.end - cur.start >= PHRASE_MIN_SECONDS
      const tooLong = cur && w.end - cur.start > MAX_SEGMENT_SECONDS
      if (speakerChanged || bigGap || breathPause || tooLong) flush()
      if (!cur) cur = { speaker, start: w.start ?? 0, end: w.end ?? 0, text: '', logprobs: [] }
      cur.text += w.text
      cur.end = w.end ?? cur.end
      if (typeof w.logprob === 'number') cur.logprobs.push(w.logprob)

      // One complete thought per timestamp: split at sentence-ending
      // punctuation once the segment is long enough to stand on its own.
      if (SENTENCE_END.test(w.text) && cur.end - cur.start >= MIN_SENTENCE_SECONDS) flush()
    } else if (cur) {
      cur.text += w.text ?? ' '
    }
  }
  flush()
  return segments
}

function getApiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY
  // Fallback: server-side-only secret file (git-ignored, never sent to browsers).
  try {
    // eslint-disable-next-line global-require
    return require('./_secret.json').ELEVENLABS_API_KEY || null
  } catch {
    return null
  }
}

async function transcribeBuffer(buffer, fileName, languageCode) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('Speech-to-text API key is not configured on the server.')
  // scribe_v2 auto-detects language switches within one file and keeps each
  // language in its own script (spec 3.2 / 3.3). scribe_v1 is EOL 2026-07-09.
  const model = process.env.ELEVENLABS_STT_MODEL || 'scribe_v2'
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()

  const form = new FormData()
  form.append('model_id', model)
  form.append('diarize', 'true')
  form.append('tag_audio_events', 'false')
  if (languageCode) form.append('language_code', languageCode)
  form.append('file', new Blob([buffer], { type: MIME[ext] || 'application/octet-stream' }), fileName)

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: form,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`ElevenLabs API error ${res.status}: ${body.slice(0, 500)}`)
  }
  const data = await res.json()
  const segments = groupWords(data.words || [])
  const last = segments[segments.length - 1]
  return {
    text: data.text || '',
    languageCode: data.language_code || null,
    segments,
    durationSec: last ? Math.ceil(last.end) : null,
  }
}

function avgConfidence(segments) {
  const confs = segments.map((s) => s.conf).filter((c) => typeof c === 'number')
  if (!confs.length) return 1
  return confs.reduce((a, b) => a + b, 0) / confs.length
}

// Natural language handling (spec 3.2/3.3): auto-detect first; if the model
// seems unsure, retry assuming Sinhala and keep whichever result it was more
// confident about. No user-facing language selection.
async function transcribeSmart(buffer, fileName) {
  const first = await transcribeBuffer(buffer, fileName)
  const firstConf = avgConfidence(first.segments)
  if (firstConf >= 0.8 || first.languageCode === 'si') return first
  try {
    const retry = await transcribeBuffer(buffer, fileName, 'si')
    if (avgConfidence(retry.segments) > firstConf) return retry
  } catch {
    // keep the auto-detected result if the retry fails
  }
  return first
}

module.exports = { groupWords, transcribeBuffer, transcribeSmart, getApiKey }
