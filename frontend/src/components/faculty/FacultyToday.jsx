// Module Owner: Krishna Patel (24000131) & Vikas Patanwadiya (24000605) — Database & GUI
// Faculty landing page: today's scheduled classes (from the imported timetable),
// each with a one-click action to take attendance or review what was taken.

import { useEffect, useState } from 'react'
import { getFacultyToday } from '../../api'

function to12h(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = Number(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m} ${ampm}`
}

function minutesNow() {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function toMinutes(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function FacultyToday({ navigate }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await getFacultyToday())
    } catch (err) {
      setError(err.message || 'Failed to load today\'s classes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const classes = data?.classes || []
  const now = minutesNow()

  const statusOf = (c) => {
    const start = toMinutes(c.start_time)
    const end = toMinutes(c.end_time) ?? (start != null ? start + 60 : null)
    if (c.session && c.session.status === 'finalized') return 'done'
    if (c.session && c.session.status === 'active') return 'active'
    if (start != null && end != null && now >= start && now <= end) return 'now'
    if (start != null && now < start) return 'upcoming'
    return 'past'
  }

  const startAttendance = (c) => {
    const subject = {
      id: c.subject_id,
      name: c.course_name,
      code: c.course_code,
      section: c.section,
    }
    navigate('start-session', { subjectId: c.subject_id, subject })
  }

  const continueSession = (c) => {
    const subject = { id: c.subject_id, name: c.course_name, code: c.course_code, section: c.section }
    const target = c.session?.method === 'group_photo' ? 'group-photo-session' : 'live-session'
    navigate(target, { sessionId: c.session.id, subjectId: c.subject_id, subject })
  }

  const reviewSession = (c) => {
    const subject = { id: c.subject_id, name: c.course_name, code: c.course_code, section: c.section }
    navigate('session-review', { sessionId: c.session.id, subjectId: c.subject_id, subject })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-400">{data?.day_name || 'Today'}</p>
          <h2 className="text-2xl font-bold tracking-tight text-white">Today's Classes</h2>
          <p className="mt-1 text-sm text-slate-400">
            {data?.date} · {classes.length} class{classes.length === 1 ? '' : 'es'} scheduled
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('timetable-import')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Import Timetable
          </button>
          <button
            onClick={() => navigate('subjects')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            My Subjects
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="rounded bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30">Retry</button>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-800 bg-slate-800/40" />
          ))}
        </div>
      )}

      {/* Empty: no timetable imported yet */}
      {!loading && !error && classes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-400 ring-1 ring-indigo-500/20">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">No classes scheduled today</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
            Import your timetable once and your classes will appear here automatically every day.
          </p>
          <button
            onClick={() => navigate('timetable-import')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
          >
            Import Timetable
          </button>
        </div>
      )}

      {/* Class list */}
      {!loading && classes.length > 0 && (
        <div className="space-y-3">
          {classes.map((c) => {
            const status = statusOf(c)
            const badge = {
              now: { label: 'Now', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
              active: { label: 'In progress', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
              done: { label: 'Attendance taken', cls: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
              upcoming: { label: 'Upcoming', cls: 'bg-slate-600/20 text-slate-400 border-slate-600/40' },
              past: { label: 'Ended', cls: 'bg-slate-700/30 text-slate-500 border-slate-700/50' },
            }[status]

            return (
              <div
                key={c.id}
                className={`flex flex-col gap-4 rounded-xl border bg-slate-800/60 p-4 sm:flex-row sm:items-center sm:justify-between ${
                  status === 'now' ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'border-slate-700'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-24 shrink-0 text-sm">
                    <div className="font-semibold text-white">{to12h(c.start_time)}</div>
                    <div className="text-xs text-slate-500">{to12h(c.end_time)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                        {c.course_code || 'CLASS'}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <h3 className="mt-1 font-bold text-white">{c.course_name}</h3>
                    <p className="text-xs text-slate-400">
                      {c.section ? `Section ${c.section}` : 'Section —'}
                      {c.room ? ` · ${c.room}` : ''}
                      {c.session?.present_count != null ? ` · ${c.session.present_count} present` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  {status === 'done' ? (
                    <button
                      onClick={() => reviewSession(c)}
                      className="rounded-lg border border-slate-600 bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      Review
                    </button>
                  ) : status === 'active' ? (
                    <button
                      onClick={() => continueSession(c)}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      onClick={() => startAttendance(c)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                        status === 'now'
                          ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/25'
                          : 'bg-indigo-600 hover:bg-indigo-500'
                      }`}
                    >
                      Start Attendance
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
