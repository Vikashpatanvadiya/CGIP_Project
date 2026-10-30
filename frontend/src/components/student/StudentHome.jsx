import { useCallback, useEffect, useState } from 'react'
import { getNotifications, getStudentSubjects, getStudentToday } from '../../api'

function to12h(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = Number(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m} ${ampm}`
}

export default function StudentHome({ user, navigate }) {
  const [subjects, setSubjects] = useState([])
  const [today, setToday] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [subjectsData, notifData, todayData] = await Promise.all([
        getStudentSubjects().catch(() => []),
        getNotifications().catch(() => []),
        getStudentToday().catch(() => null),
      ])

      setSubjects(subjectsData || [])
      setToday(todayData)
      const unread = (notifData || []).filter((n) => !n.is_read).length
      setUnreadCount(unread)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // Overall attendance calculation
  const totalClasses = subjects.reduce((sum, s) => sum + (s.total_sessions || s.total_classes || 0), 0)
  const totalAttended = subjects.reduce((sum, s) => sum + (s.attended_sessions || s.present_count || 0), 0)
  const overallPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 100

  return (
    <div className="space-y-6">
      {/* Top Welcome & Notification Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-100">
            Hello, {user?.name?.split(' ')[0] || 'Student'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Your classes, face setup, and attendance — all in one place.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Button */}
          <button
            onClick={() => navigate('notifications')}
            className="relative flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 shadow transition hover:border-slate-600 hover:bg-slate-700"
          >
            <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Alerts</span>
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Join class button */}
          <button
            onClick={() => navigate('join-class')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Join a Class
          </button>
        </div>
      </div>

      {/* Face setup callout */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-700 bg-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-slate-100">Set up your Face ID</h3>
            <p className="text-xs text-slate-400">
              Capture a few samples once so you can check yourself in during class.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('face-registration')}
          className="btn-cream shrink-0 px-4 py-2 text-xs"
        >
          Register / update
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <span className="text-xs text-slate-400">Enrolled Subjects</span>
          <div className="mt-1 text-2xl font-bold text-white">{subjects.length}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <span className="text-xs text-slate-400">Total Classes</span>
          <div className="mt-1 text-2xl font-bold text-white">{totalClasses}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <span className="text-xs text-slate-400">Classes Attended</span>
          <div className="mt-1 text-2xl font-bold text-emerald-400">{totalAttended}</div>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <span className="text-xs text-slate-400">Overall Attendance</span>
          <div className={`mt-1 text-2xl font-bold ${overallPercentage >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {overallPercentage}%
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadDashboard} className="rounded bg-red-500/20 px-3 py-1 text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* Today's Classes */}
      {today && (today.classes || []).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Today · {today.day_name}</h3>
            <span className="text-xs text-slate-400">{today.date} · live now</span>
          </div>
          <div className="space-y-2">
            {today.classes.map((c) => {
              const canSelfMark = c.session && c.session.is_open && c.session.allow_self_mark && !c.attended
              let label, cls
              if (c.attended) {
                label = 'Present ✓'; cls = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              } else if (c.session && c.session.is_open) {
                label = 'Check-in open'; cls = 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              } else if (c.session && c.session.status === 'finalized') {
                label = 'Absent'; cls = 'bg-red-500/10 text-red-400 border-red-500/30'
              } else if (c.session) {
                label = 'Closed'; cls = 'bg-slate-600/20 text-slate-400 border-slate-600/40'
              } else {
                label = 'Not started'; cls = 'bg-slate-600/20 text-slate-400 border-slate-600/40'
              }
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-20 shrink-0 text-xs">
                      <div className="font-semibold text-white">{to12h(c.start_time)}</div>
                      <div className="text-slate-500">{to12h(c.end_time)}</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400">{c.course_code || 'CLASS'}</span>
                        <span className="text-sm font-semibold text-white">{c.course_name}</span>
                      </div>
                      <p className="text-xs text-slate-400">{c.room || ''}{c.section ? ` · Sec ${c.section}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {canSelfMark && (
                      <button
                        onClick={() => {
                          if (!today.has_face) { navigate('face-registration'); return }
                          navigate('student-self-mark', { sessionId: c.session.id, classInfo: c })
                        }}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                      >
                        {today.has_face ? 'Give Attendance' : 'Register Face'}
                      </button>
                    )}
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
                  </div>
                </div>
              )
            })}
          </div>
          {!today.has_face && (
            <p className="text-xs text-amber-400">
              Register your Face ID so you can be marked present when faculty takes attendance.
            </p>
          )}
        </div>
      )}

      {/* Enrolled Subjects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Your Enrolled Subjects</h3>
          <button
            onClick={() => navigate('student-attendance')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            View Detailed Log →
          </button>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-slate-800/40" />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h4 className="text-base font-semibold text-white">No enrolled courses yet</h4>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              Ask your faculty for a 6-digit join code to register for your subjects.
            </p>
            <button
              onClick={() => navigate('join-class')}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500"
            >
              Enter Join Code
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.map((sub) => {
              const attended = sub.attended_sessions ?? sub.present_count ?? 0
              const total = sub.total_sessions ?? sub.total_classes ?? 0
              const percent = total > 0 ? Math.round((attended / total) * 100) : 100
              const isGood = percent >= 75

              return (
                <div
                  key={sub.id}
                  onClick={() => navigate('student-attendance', { subjectId: sub.id, subject: sub })}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60 p-5 shadow-lg backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/50 hover:bg-slate-800"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                        {sub.code || 'SUB'}
                      </span>
                      <h4 className="mt-2 font-bold text-white group-hover:text-indigo-300 transition-colors">
                        {sub.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Faculty: {sub.faculty_name || 'Department Faculty'}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isGood
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {percent}%
                    </span>
                  </div>

                  {/* Attendance Progress bar */}
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span>Attended</span>
                      <span className="font-semibold text-slate-200">
                        {attended} / {total} classes
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isGood ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, percent)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-700/60 pt-3 text-xs font-medium text-indigo-400">
                    <span>View attendance logs</span>
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
