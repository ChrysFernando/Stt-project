import fs from 'node:fs'

const API_URL = 'https://api.elevenlabs.io/v1/speech-to-text'

const MIME = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.m4a': 'audio/mp4',
}

// Split points while grouping words into segments.
const MAX_GAP_SECONDS = 1.0
const MAX_SEGMENT_SECONDS = 15

const SINHALA = /[඀-෿]/
const LATIN = /[A-Za-z]/

function langOf(text) {
  const si = SINHALA.test(text)
  const en = LATIN.test(text)
  if (si && en) return 'MIX'
  if (si) return 'SI'
  return 'EN'
}

// Convert the ElevenLabs word stream (word/spacing/audio_event items with
// start, end, speaker_id, logprob) into speaker-attributed segments shaped
// the way the frontend expects.
export function groupWords(words) {
  const segments = []
  const speakerLabels = new Map() // speaker_0 -> Speaker 1 (in order of appearance)
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
      const tooLong = cur && w.end - cur.start > MAX_SEGMENT_SECONDS
      if (speakerChanged || bigGap || tooLong) flush()

      if (!cur) {
        cur = { speaker, start: w.start ?? 0, end: w.end ?? 0, text: '', logprobs: [] }
      }
      cur.text += w.text
      cur.end = w.end ?? cur.end
      if (typeof w.logprob === 'number') cur.logprobs.push(w.logprob)
    } else if (cur) {
      // spacing — belongs to the current segment
      cur.text += w.text ?? ' '
    }
  }
  flush()
  return segments
}

export function isConfigured() {
  return Boolean(process.env.ELEVENLABS_API_KEY)
}

export async function transcribeFile(filePath, originalName) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not set. Add it to backend/.env (see .env.example).')
  }
  const model = process.env.ELEVENLABS_STT_MODEL || 'scribe_v1'
  const ext = originalName.slice(originalName.lastIndexOf('.')).toLowerCase()

  const form = new FormData()
  form.append('model_id', model)
  form.append('diarize', 'true')
  form.append('tag_audio_events', 'false')
  form.append(
    'file',
    new Blob([fs.readFileSync(filePath)], { type: MIME[ext] || 'application/octet-stream' }),
    originalName,
  )

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
