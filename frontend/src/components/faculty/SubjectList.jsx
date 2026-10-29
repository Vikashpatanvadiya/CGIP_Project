import { useEffect, useState } from 'react'
import { getSubjects } from '../../api'

export default function SubjectList({ navigate }) {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadSubjects = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSubjects()
      setSubjects(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load subjects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Subject Courses</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manage your classes, enrollments, and live attendance sessions
          </p>
        </div>
        <button
          onClick={() => navigate('create-subject')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Subject
        </button>
      </div>

      {/* Error notification */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={loadSubjects}
            className="rounded bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/30"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-xl border border-slate-800 bg-slate-800/40 p-5"
            >
              <div className="h-5 w-3/4 rounded bg-slate-700/60 mb-3"></div>
              <div className="h-4 w-1/3 rounded bg-slate-700/40 mb-6"></div>
              <div className="h-4 w-1/2 rounded bg-slate-700/40 mt-8"></div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && subjects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-400 ring-1 ring-indigo-500/20">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">No subjects created yet</h3>
          <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
            Get started by creating your first subject course to generate join codes and take attendance.
          </p>
          <button
            onClick={() => navigate('create-subject')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Your First Subject
          </button>
        </div>
      )}

      {/* Subject cards grid */}
      {!loading && subjects.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((sub) => {
            const enrolled = sub.enrolled_count ?? 0
            const capacity = sub.capacity || 60
            const pending = sub.pending_count ?? 0
            const fillPercent = Math.min(100, Math.round((enrolled / capacity) * 100))

            return (
              <div
                key={sub.id}
                onClick={() => navigate('subject-dashboard', { subjectId: sub.id, subject: sub })}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60 p-5 shadow-lg backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/50 hover:bg-slate-800 hover:shadow-indigo-500/10 hover:shadow-xl"
              >
                {/* Glow accent */}
                <div className="absolute top-0 right-0 h-24 w-24 rounded-bl-full bg-gradient-to-br from-indigo-500/10 to-transparent transition group-hover:from-indigo-500/20"></div>

                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                      {sub.code || 'NO-CODE'}
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {sub.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Section: <span className="text-slate-200 font-medium">{sub.section || 'Default'}</span>
                    </p>
                  </div>

                  {pending > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/30">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
                      {pending} pending
                    </span>
                  )}
                </div>

                {/* Join code info */}
                <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2 text-xs">
                  <span className="text-slate-400">Join Code:</span>
                  <span className="font-mono font-bold tracking-wider text-indigo-300">
                    {sub.join_code || '—'}
                  </span>
                </div>

                {/* Capacity progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                    <span>Enrolled</span>
                    <span className="font-medium text-slate-200">
                      {enrolled} / {capacity} ({fillPercent}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${fillPercent}%` }}
                    ></div>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-700/60 pt-3 text-xs font-medium text-indigo-400">
                  <span>Open dashboard</span>
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
  )
}
