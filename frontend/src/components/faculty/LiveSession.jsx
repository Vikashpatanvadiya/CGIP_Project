import { useEffect, useRef, useState } from 'react'
import { markSessionFrame } from '../../api'
import { useCamera } from '../../hooks/useCamera'

const CAPTURE_INTERVAL_MS = 1500

export default function LiveSession({ sessionId, session, subjectId, subject, navigate }) {
  const { videoRef, ready, error: cameraError, captureFrame } = useCamera()
  const overlayRef = useRef(null)
  const [results, setResults] = useState([])
  const [statusMessage, setStatusMessage] = useState('Initializing camera feed...')
  const [running, setRunning] = useState(true)
  const [markedStudents, setMarkedStudents] = useState([]) // unique list of detected students
  const [fpsCounter, setFpsCounter] = useState(0)

  useEffect(() => {
    if (!ready || !running || !sessionId) return

    const interval = setInterval(async () => {
      const frame = captureFrame()
      if (!frame) return

      try {
        const detections = await markSessionFrame(sessionId, frame)
        setResults(detections || [])
        setFpsCounter((c) => c + 1)

        if (detections && detections.length > 0) {
          setStatusMessage(`${detections.length} face(s) in frame`)
          // Update running list of recognized students
          setMarkedStudents((prev) => {
            const updated = [...prev]
            detections.forEach((d) => {
              if (d.student_id) {
                const existingIdx = updated.findIndex((s) => s.student_id === d.student_id)
                const entry = {
                  student_id: d.student_id,
                  name: d.name,
                  enrollment_no: d.enrollment_no,
                  confidence: d.confidence,
                  timestamp: new Date().toLocaleTimeString(),
                  attendance_marked: d.attendance_marked,
                }
                if (existingIdx >= 0) {
                  updated[existingIdx] = entry
                } else {
                  updated.unshift(entry)
                }
              }
            })
            return updated
          })
        } else {
          setStatusMessage('Scanning... No faces detected')
        }
      } catch (err) {
        setStatusMessage(err.message || 'Error processing frame')
      }
    }, CAPTURE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [ready, running, sessionId, captureFrame])

  // Canvas overlay rendering
  useEffect(() => {
    const video = videoRef.current
    const canvas = overlayRef.current
    if (!video || !canvas) return

    canvas.width = video.clientWidth
    canvas.height = video.clientHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!video.videoWidth) return
    const scaleX = canvas.width / video.videoWidth
    const scaleY = canvas.height / video.videoHeight

    results.forEach((r) => {
      if (!r.box) return
      const x = r.box.x * scaleX
      const y = r.box.y * scaleY
      const w = r.box.w * scaleX
      const h = r.box.h * scaleY
      const known = r.student_id !== null && r.student_id !== undefined

      ctx.strokeStyle = known ? '#22c55e' : '#ef4444'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, w, h)

      const label = known
        ? `${r.name} (${(r.confidence * 100).toFixed(0)}%)${r.attendance_marked ? ' ✓' : ''}`
        : 'Unknown'
      ctx.fillStyle = known ? '#22c55e' : '#ef4444'
      ctx.font = '14px sans-serif'
      ctx.fillText(label, x, Math.max(14, y - 6))
    })
  }, [results, videoRef])

  const handleEndAndReview = () => {
    navigate('session-review', { sessionId, session, subjectId, subject })
  }

  return (
    <div className="space-y-6">
      {/* Session header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Live Session Active
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            {subject?.name || 'Class Attendance'}
          </h2>
          <p className="text-xs text-slate-400">
            {subject?.code || ''} · Section {subject?.section || 'Default'} · Session ID: #{sessionId}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setRunning((r) => !r)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              running
                ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
            }`}
          >
            {running ? 'Pause Recognition' : 'Resume Recognition'}
          </button>
          <button
            onClick={handleEndAndReview}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
          >
            End & Review Attendance →
          </button>
        </div>
      </div>

      {/* Main Grid: Camera feed on left, Real-time marked list on right */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-slate-700 bg-black shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0" />

            {/* Live Indicator overlay badge */}
            <div className="absolute top-4 left-4 flex items-center gap-2 rounded-lg bg-slate-900/80 px-3 py-1.5 text-xs text-white backdrop-blur">
              <span className={`h-2 w-2 rounded-full ${running ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`}></span>
              <span>{running ? 'LIVE CAMERA' : 'PAUSED'}</span>
            </div>

            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 p-6 text-center text-red-400">
                <p>Camera Error: {cameraError}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-2 text-xs text-slate-400">
            <span>Status: <strong className="text-slate-200">{statusMessage}</strong></span>
            <span>Frames Analyzed: <strong className="text-indigo-400">{fpsCounter}</strong></span>
          </div>
        </div>

        {/* Live Detected Roster */}
        <div className="flex flex-col rounded-2xl border border-slate-700 bg-slate-800/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Recognized Students</h3>
              <p className="text-xs text-slate-400">Real-time attendance stream</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/20">
              {markedStudents.length} present
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[460px] pr-1">
            {markedStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-xs text-slate-500">
                <svg className="h-8 w-8 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7 7z" />
                </svg>
                <span>Awaiting face recognition...</span>
                <span>Students will appear here as their faces are identified.</span>
              </div>
            ) : (
              markedStudents.map((st) => (
                <div
                  key={st.student_id}
                  className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/60 p-3 text-xs transition hover:border-slate-600"
                >
                  <div>
                    <h4 className="font-semibold text-white">{st.name}</h4>
                    <span className="font-mono text-[11px] text-slate-400">{st.enrollment_no || 'ID: ' + st.student_id}</span>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400">
                      ✓ Present
                    </span>
                    <div className="mt-1 text-[10px] text-slate-500">
                      {(st.confidence * 100).toFixed(0)}% · {st.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-slate-700/60 mt-4">
            <button
              onClick={handleEndAndReview}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              Finish Session & View All Records
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
