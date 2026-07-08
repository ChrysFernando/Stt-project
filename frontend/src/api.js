// ---------------------------------------------------------------
// MOCK API — temporary stand-in for the real backend.
// When the backend is ready, replace these functions with real
// fetch() calls. The rest of the app will not need to change.
// ---------------------------------------------------------------

const SAMPLE_SEGMENTS = [
  { id: 1, start: 0.0, end: 4.2, speaker: 'Speaker 1', text: 'සුභ උදෑසනක්. අද රැස්වීම ආරම්භ කරමු.' },
  { id: 2, start: 4.2, end: 9.8, speaker: 'Speaker 2', text: 'Good morning sir. පළමු කාරණය ගැන report එක ready ද?' },
  { id: 3, start: 9.8, end: 16.5, speaker: 'Speaker 1', text: 'ඔව්, draft එක ඊයේ evening එකේ complete කළා. Final version එක අද submit කරන්නම්.' },
  { id: 4, start: 16.5, end: 22.0, speaker: 'Speaker 3', text: 'මට එක question එකක් තියෙනවා. Budget approval එක ලැබුණද?' },
  { id: 5, start: 22.0, end: 28.4, speaker: 'Speaker 2', text: 'Yes, approval came through last Friday. ඒක minutes වල record කරලා තියෙනවා.' },
  { id: 6, start: 28.4, end: 34.0, speaker: 'Speaker 1', text: 'හොඳයි. එහෙනම් next item එකට යමු. Please refer page five of the agenda.' },
]

let jobs = [
  {
    id: 'job-demo-1',
    fileName: 'commission_hearing_demo.mp3',
    duration: 34,
    status: 'completed',
    createdAt: '2026-07-08 09:15',
    language: 'Sinhala + English',
    audioUrl: null,
    segments: SAMPLE_SEGMENTS,
  },
]

let nextId = 2

export function listJobs() {
  return [...jobs]
}

export function getJob(id) {
  return jobs.find((j) => j.id === id) || null
}

// Simulates: upload file -> processing -> completed with a transcript.
export function uploadAudio(file, onUpdate) {
  const job = {
    id: `job-${nextId++}`,
    fileName: file.name,
    duration: null,
    status: 'processing',
    createdAt: new Date().toLocaleString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }),
    language: 'Sinhala + English',
    // Real object URL so the audio player can actually play the uploaded file.
    audioUrl: URL.createObjectURL(file),
    segments: [],
  }
  jobs = [job, ...jobs]
  onUpdate(listJobs())

  // Fake processing delay, then attach the sample transcript.
  setTimeout(() => {
    job.status = 'completed'
    job.segments = SAMPLE_SEGMENTS.map((s) => ({ ...s }))
    job.duration = 34
    onUpdate(listJobs())
  }, 3000)

  return job
}

export function saveSegments(jobId, segments) {
  const job = getJob(jobId)
  if (job) job.segments = segments
}
