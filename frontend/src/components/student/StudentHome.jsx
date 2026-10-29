import { useCallback, useEffect, useState } from 'react'
import { getNotifications, getStudentSubjects } from '../../api'

export default function StudentHome({ user, navigate }) {
  const [subjects, setSubjects] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [subjectsData, notifData] = await Promise.all([
        getStudentSubjects().catch(() => []),
        getNotifications().catch(() => []),
      ])

      setSubjects(subjectsData || [])
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
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Welcome, {user?.name || 'Student'}! 👋
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Track your classes, face recognition status, and real-time attendance
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

      {/* Face Registration Callout Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/60 p-5 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11m0 0a8.003 8.003 0 0115.357-2m1.571 2.495A13.978 13.978 0 0120 11" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white">Biometric Face Registration</h3>
              <p className="text-xs text-slate-300">
                Register or refresh your 3 face samples so faculty cameras recognize you in live attendance.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('face-registration')}
            className="shrink-0 rounded-lg bg-indigo-600/80 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-indigo-500 hover:shadow-indigo-500/20"
          >
            Register / Update Face ID →
          </button>
        </div>
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
