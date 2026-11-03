// Module Owner: Krishna Patel (24000131) & Vikas Patanwadiya (24000605) — Database & GUI
// Faculty view after opening a self check-in window: a countdown, the live join
// code, and a roster that fills in as students self-mark (polled). Finalize when
// done to lock the session.

import { useCallback, useEffect, useState } from 'react'
import { finalizeSession, getSession, getSessionAttendance, getSubjectRoster } from '../../api'

function fmtCountdown(ms) {
  if (ms <= 0) return 'Closed'
  const total = Math.floor(ms / 1000)
  const m = String(Math.floor(total / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

export default function SelfMarkMonitor({ sessionId, session, subjectId, subject, navigate }) {
  const [detail, setDetail] = useState(session || null)
  const [present, setPresent] = useState([])
  const [roster, setRoster] = useState([])
  const [now, setNow] = useState(Date.now())
  const [finalizing, setFinalizing] = useState(false)

  const load = useCallback(async () => {
    const [sess, att, ros] = await Promise.all([
      getSession(sessionId).catch(() => null),
      getSessionAttendance(sessionId).catch(() => []),
      getSubjectRoster(subjectId || session?.subject_id).catch(() => []),
    ])
    if (sess) setDetail(sess)
    setPresent((att || []).filter((a) => String(a.status).toLowerCase() === 'present'))
    setRoster(ros || [])
  }, [sessionId, subjectId, session])

  useEffect(() => {
    load()
    const poll = setInterval(load, 3000) // refresh roster as students check in
    const tick = setInterval(() => setNow(Date.now()), 1000)
    return () => {
      clearInterval(poll)
      clearInterval(tick)
    }
  }, [load])

  const openUntil = detail?.open_until ? new Date(detail.open_until).getTime() : null
  const remaining = openUntil ? openUntil - now : null
  const isOpen = detail?.status === 'active' && (openUntil === null || remaining > 0)

  const handleFinalize = async () => {
    setFinalizing(true)
    try {
      await finalizeSession(sessionId, [])
      navigate('session-review', { sessionId, subjectId: subjectId || detail?.subject_id, subject })
    } catch {
      setFinalizing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('faculty-today')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Today
        </button>
        <button
          onClick={handleFinalize}
          disabled={finalizing}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {finalizing ? 'Finalizing…' : 'Finalize Attendance'}
        </button>
      </div>

      {/* Status banner */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/20">
              {detail?.subject_code || subject?.code || 'COURSE'}
            </span>
            <h1 className="mt-2 text-2xl font-bold text-white">{detail?.subject_name || subject?.name || 'Self Check-in'}</h1>
            <p className="text-xs text-slate-400">Students check in on their own phones during the window.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`rounded-xl border px-5 py-3 text-center ${isOpen ? 'border-emerald-500/30 bg-emerald-950/20' : 'border-slate-700 bg-slate-900/80'}`}>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">{isOpen ? 'Window closes in' : 'Window'}</span>
              <div className={`text-2xl font-bold tabular-nums ${isOpen ? 'text-emerald-400' : 'text-slate-400'}`}>
                {remaining === null ? 'Open' : fmtCountdown(remaining)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-5 py-3 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Checked in</span>
              <div className="text-2xl font-bold text-white">{present.length}<span className="text-sm text-slate-500">/{roster.length}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Live present list */}
      <div className="rounded-xl border border-emerald-500/20 bg-slate-800/40 p-4">
        <h3 className="mb-3 text-sm font-bold text-emerald-400">Checked in ({present.length})</h3>
        <div className="space-y-2">
          {present.length === 0 && (
            <p className="text-xs text-slate-500">Waiting for students to check in on their phones…</p>
          )}
          {present.map((p) => (
            <div key={p.student_id} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2 text-sm">
              <span className="font-medium text-white">{p.name}</span>
              <span className="text-xs text-slate-400">{p.enrollment_no} · {p.time_in}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Finalize to lock the session. You can still correct statuses on the review screen afterwards.
        </p>
      </div>
    </div>
  )
}
