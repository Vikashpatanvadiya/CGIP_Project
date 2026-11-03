// Module Owner: Vikas Patanwadiya (24000605) — Feature Extraction & Recognition (GUI)
// Student self check-in: during an open window, the student runs a short
// head-turn capture on their own camera. Frames go to the backend which checks
// liveness (rejects a held-up photo) and that the face is really theirs.

import { useRef, useState } from 'react'
import { useCamera } from '../../hooks/useCamera'
import { selfMarkAttendance } from '../../api'

const FRAMES = 14
const INTERVAL_MS = 280

export default function StudentSelfMark({ sessionId, classInfo, navigate }) {
  const { videoRef, ready, error: camError, captureFrame } = useCamera()
  const [phase, setPhase] = useState('idle') // idle | capturing | submitting | success | failed
  const [message, setMessage] = useState(null)
  const [result, setResult] = useState(null)
  const capturing = useRef(false)

  const run = async () => {
    if (!ready || capturing.current) return
    capturing.current = true
    setPhase('capturing')
    setMessage('Slowly turn your head left and right…')

    const frames = []
    await new Promise((resolve) => {
      let n = 0
      const id = setInterval(() => {
        const f = captureFrame()
        if (f) frames.push(f)
        n += 1
        if (n >= FRAMES) {
          clearInterval(id)
          resolve()
        }
      }, INTERVAL_MS)
    })

    setPhase('submitting')
    setMessage('Verifying…')
    try {
      const res = await selfMarkAttendance(sessionId, frames)
      setResult(res)
      setPhase('success')
    } catch (err) {
      setMessage(err.message || 'Could not verify. Please try again.')
      setPhase('failed')
    } finally {
      capturing.current = false
    }
  }

  if (phase === 'success') {
    return (
      <div className="max-w-md mx-auto rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-xl font-bold text-white">You're marked present ✓</h2>
        {classInfo && <p className="text-sm text-slate-300">{classInfo.course_name}{classInfo.course_code ? ` · ${classInfo.course_code}` : ''}</p>}
        {result?.confidence != null && (
          <p className="text-xs text-slate-500">Match confidence {(result.confidence * 100).toFixed(0)}%</p>
        )}
        <button onClick={() => navigate('student-home')} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div>
        <button
          onClick={() => navigate('student-home')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Cancel
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Give Attendance</h2>
        {classInfo && (
          <p className="mt-1 text-sm text-slate-400">
            {classInfo.course_code ? `${classInfo.course_code} · ` : ''}{classInfo.course_name}
          </p>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-black">
        <video ref={videoRef} autoPlay muted playsInline className="w-full" />
        {phase === 'capturing' && (
          <div className="absolute inset-x-0 top-0 bg-indigo-600/90 py-2 text-center text-sm font-semibold text-white">
            Turn your head slowly ← →
          </div>
        )}
      </div>

      {camError && <p className="text-sm text-red-400">Camera error: {camError}. Allow camera access to check in.</p>}

      {phase === 'failed' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{message}</div>
      )}
      {(phase === 'capturing' || phase === 'submitting') && (
        <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm text-indigo-300">{message}</div>
      )}

      <button
        onClick={run}
        disabled={!ready || phase === 'capturing' || phase === 'submitting'}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {phase === 'capturing' ? 'Hold still & turn…' : phase === 'submitting' ? 'Verifying…' : phase === 'failed' ? 'Try again' : 'Start check-in'}
      </button>

      <p className="text-center text-xs text-slate-500">
        A real, present face is required — a photo on a screen won't be accepted.
      </p>
    </div>
  )
}
