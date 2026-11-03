import { useState } from 'react'
import { createSession } from '../../api'

export default function StartSession({ subjectId, subject, navigate, date }) {
  const [method, setMethod] = useState('self_mark') // 'self_mark' | 'live' | 'group_photo'
  const [duration, setDuration] = useState(5) // minutes students can self check-in
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const todayStr = new Date().toISOString().slice(0, 10)
  const isBackdated = Boolean(date) && date !== todayStr
  const sessionDay = date ? new Date(`${date}T00:00:00`) : new Date()

  const currentDate = sessionDay.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const currentTime = new Date().toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleBegin = async () => {
    setLoading(true)
    setError(null)

    try {
      const opts = { method }
      if (date) opts.session_date = date
      if (method === 'self_mark') {
        opts.duration_minutes = duration
        opts.allow_self_mark = true
      }
      const session = await createSession(subjectId, opts)

      // A class can only be marked once per day. If one already exists, the
      // backend returns it with existing:true — resume or review it instead.
      if (session.existing) {
        if (session.status !== 'active') {
          navigate('session-review', { sessionId: session.id, session, subjectId, subject })
        } else if (session.method === 'self_mark') {
          navigate('self-mark-monitor', { sessionId: session.id, session, subjectId, subject })
        } else if (session.method === 'group_photo') {
          navigate('group-photo-session', { sessionId: session.id, session, subjectId, subject })
        } else {
          navigate('live-session', { sessionId: session.id, session, subjectId, subject })
        }
        return
      }

      if (method === 'self_mark') {
        navigate('self-mark-monitor', { sessionId: session.id, session, subjectId, subject })
      } else if (method === 'live') {
        navigate('live-session', { sessionId: session.id, session, subjectId, subject })
      } else {
        navigate('group-photo-session', { sessionId: session.id, session, subjectId, subject })
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize session')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div>
        <button
          onClick={() => navigate('subject-dashboard', { subjectId, subject })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-8 shadow-xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-md bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/20">
              {subject?.code || 'COURSE'}
            </span>
            <span className="text-xs text-slate-400">Section {subject?.section || 'Default'}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Start Attendance Session
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {subject?.name || 'Class Subject'}
          </p>
        </div>

        {/* Date and time display */}
        <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-800 bg-slate-800/40 p-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-500">Session Date</span>
            <div className="mt-1 font-semibold text-white">{currentDate}</div>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-500">Scheduled Time</span>
            <div className="mt-1 font-semibold text-indigo-400">{currentTime}</div>
          </div>
        </div>

        {isBackdated && (
          <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            You're recording attendance for a past date ({currentDate}). It will be saved against that day. For a backdated class, "Upload Class Photo" is usually the right method.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 flex items-start gap-2">
            <svg className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Method selector cards */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Select Recognition Method
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Student Self Check-in Option */}
            <div
              onClick={() => setMethod('self_mark')}
              className={`cursor-pointer rounded-xl border p-5 transition-all duration-200 ${
                method === 'self_mark'
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-lg ring-1 ring-indigo-500'
                  : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${method === 'self_mark' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${method === 'self_mark' ? 'border-indigo-500 bg-indigo-600' : 'border-slate-600'}`}>
                  {method === 'self_mark' && <span className="h-1.5 w-1.5 rounded-full bg-white"></span>}
                </div>
              </div>
              <h4 className="font-bold text-white">Student Self Check-in</h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Open a timed window; enrolled students mark themselves on their own phone with a live
                anti-spoofing check.
              </p>
            </div>

            {/* Live Camera Option */}
            <div
              onClick={() => setMethod('live')}
              className={`cursor-pointer rounded-xl border p-5 transition-all duration-200 ${
                method === 'live'
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-lg ring-1 ring-indigo-500'
                  : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    method === 'live' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    method === 'live' ? 'border-indigo-500 bg-indigo-600' : 'border-slate-600'
                  }`}
                >
                  {method === 'live' && <span className="h-1.5 w-1.5 rounded-full bg-white"></span>}
                </div>
              </div>

              <h4 className="font-bold text-white">Live Face Recognition</h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Runs continuous facial recognition via connected webcam in real-time as students enter.
              </p>
            </div>

            {/* Group Photo Option */}
            <div
              onClick={() => setMethod('group_photo')}
              className={`cursor-pointer rounded-xl border p-5 transition-all duration-200 ${
                method === 'group_photo'
                  ? 'border-indigo-500 bg-indigo-950/20 shadow-lg ring-1 ring-indigo-500'
                  : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    method === 'group_photo' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                    method === 'group_photo' ? 'border-indigo-500 bg-indigo-600' : 'border-slate-600'
                  }`}
                >
                  {method === 'group_photo' && <span className="h-1.5 w-1.5 rounded-full bg-white"></span>}
                </div>
              </div>

              <h4 className="font-bold text-white">Upload Class Photo</h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Take or upload a single high-resolution classroom photo to detect and mark all students simultaneously.
              </p>
            </div>
          </div>
        </div>

        {/* Duration selector for self check-in */}
        {method === 'self_mark' && (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-800/40 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Check-in window
            </label>
            <div className="flex flex-wrap gap-2">
              {[2, 5, 10, 15].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    duration === m ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Students can check in for {duration} minutes after you start. After that the window closes.
            </p>
          </div>
        )}

        <div className="mt-8 border-t border-slate-800 pt-6">
          <button
            onClick={handleBegin}
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Creating Session...</span>
              </>
            ) : (
              <span>
                {method === 'self_mark'
                  ? `Open Check-in Window (${duration} min)`
                  : method === 'live'
                  ? 'Begin Session (Launch Camera)'
                  : 'Begin Session (Proceed to Upload)'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
