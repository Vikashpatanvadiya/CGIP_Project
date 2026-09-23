// Module Owner: Vikas Patanwadiya (24000605) — Feature Extraction & Recognition Module (GUI integration)
// Live camera view: captures a frame every ~1.5s, posts it to /api/attendance/mark,
// and overlays the returned bounding boxes + names on a <canvas>, per Functional
// Requirement #8 (display live recognition status on the GUI).

import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { markAttendanceFromFrame } from '../api'

const CAPTURE_INTERVAL_MS = 1500

export default function LiveAttendance() {
  const { videoRef, ready, error, captureFrame } = useCamera()
  const overlayRef = useRef(null)
  const [results, setResults] = useState([])
  const [statusMessage, setStatusMessage] = useState('Waiting for camera...')
  const [running, setRunning] = useState(true)

  useEffect(() => {
    if (!ready || !running) return

    const interval = setInterval(async () => {
      const frame = captureFrame()
      if (!frame) return

      try {
        const detections = await markAttendanceFromFrame(frame)
        setResults(detections)
        setStatusMessage(
          detections.length ? `${detections.length} face(s) detected` : 'No face detected',
        )
      } catch (err) {
        setStatusMessage(err.message)
      }
    }, CAPTURE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [ready, running, captureFrame])

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
      const x = r.box.x * scaleX
      const y = r.box.y * scaleY
      const w = r.box.w * scaleX
      const h = r.box.h * scaleY
      const known = r.student_id !== null

      ctx.strokeStyle = known ? '#22c55e' : '#ef4444'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, w, h)

      const label = known
        ? `${r.name} (${(r.confidence * 100).toFixed(0)}%)${r.attendance_marked ? ' ✓' : ''}`
        : 'Unknown'
      ctx.fillStyle = known ? '#22c55e' : '#ef4444'
      ctx.font = '14px sans-serif'
      ctx.fillText(label, x, Math.max(0, y - 6))
    })
  }, [results, videoRef])

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-slate-700 bg-black">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full"
        />
        <canvas ref={overlayRef} className="absolute inset-0 pointer-events-none" />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          {running ? 'Pause' : 'Resume'} recognition
        </button>
        <span className="text-sm text-slate-400">{error ? `Camera error: ${error}` : statusMessage}</span>
      </div>
    </div>
  )
}
