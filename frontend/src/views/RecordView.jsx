import { useEffect, useRef, useState } from 'react'
import Icon from '../icons.jsx'
import { uploadAudio } from '../api.js'

const TIERS = ['Public', 'Restricted', 'Confidential']
const MAX_SECONDS = 300 // recording cap keeps files well under the online upload limit

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function RecordView({ onUploaded, goToJobs }) {
  const [phase, setPhase] = useState('idle') // idle | recording | preview
  const [seconds, setSeconds] = useState(0)
  const [tier, setTier] = useState('Restricted')
  const [error, setError] = useState(null)
  const [blobInfo, setBlobInfo] = useState(null) // { blob, url, ext }
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)

  useEffect(() => () => {
    // leave the page: stop everything
    clearInterval(timerRef.current)
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
    if (rec) rec.stream.getTracks().forEach((t) => t.stop())
  }, [])

  async function start() {
    setError(null)
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Microphone access was blocked. Please allow the microphone for this site and try again.')
      return
    }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
      (m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m),
    )
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    chunksRef.current = []
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data)
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      const type = rec.mimeType || 'audio/webm'
      const ext = type.includes('mp4') ? 'm4a' : 'webm'
      const blob = new Blob(chunksRef.current, { type })
      setBlobInfo({ blob, url: URL.createObjectURL(blob), ext })
      setPhase('preview')
    }
    recorderRef.current = rec
    rec.start()
    setSeconds(0)
    setPhase('recording')
    timerRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stop()
        return s + 1
      })
    }, 1000)
  }

  function stop() {
    clearInterval(timerRef.current)
    const rec = recorderRef.current
    if (rec && rec.state !== 'inactive') rec.stop()
  }

  async function transcribe() {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')
    const file = new File([blobInfo.blob], `dictation-${stamp}.${blobInfo.ext}`, { type: blobInfo.blob.type })
    try {
      await uploadAudio(file, tier, onUploaded)
      goToJobs()
    } catch (e) {
      setError(e.message)
    }
  }

  function discard() {
    if (blobInfo) URL.revokeObjectURL(blobInfo.url)
    setBlobInfo(null)
    setSeconds(0)
    setPhase('idle')
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Record &amp; Dictate</h1>
        <p className="page-sub">Speak directly into the system — your words become a transcript.</p>
      </div>

      <div className="card rec-stage">
        {phase === 'idle' && (
          <>
            <button className="rec-btn" onClick={start} aria-label="Start recording">
              <Icon name="mic" size={30} />
            </button>
            <h3>Tap to start recording</h3>
            <p className="muted">Sinhala, English or mixed — up to {MAX_SECONDS / 60} minutes per dictation.</p>
          </>
        )}

        {phase === 'recording' && (
          <>
            <button className="rec-btn recording" onClick={stop} aria-label="Stop recording">
              <Icon name="stop" size={28} />
            </button>
            <h3 className="rec-timer mono">{fmt(seconds)}</h3>
            <p className="muted">Recording… tap the button to stop.</p>
          </>
        )}

        {phase === 'preview' && blobInfo && (
          <>
            <h3 style={{ marginBottom: 10 }}>Review your dictation ({fmt(seconds)})</h3>
            <audio src={blobInfo.url} controls style={{ width: '100%', maxWidth: 460 }} />
            <div className="radio-row" style={{ justifyContent: 'center', marginTop: 16 }}>
              {TIERS.map((t) => (
                <button key={t} className={`chip-btn ${tier === t ? 'on' : ''}`} onClick={() => setTier(t)}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn secondary" onClick={discard}>Discard</button>
              <button className="btn" onClick={transcribe}><Icon name="upload" size={15} /> Transcribe</button>
            </div>
          </>
        )}

        {error && <p className="upload-note err" style={{ marginTop: 14 }}>{error}</p>}
      </div>
    </div>
  )
}
