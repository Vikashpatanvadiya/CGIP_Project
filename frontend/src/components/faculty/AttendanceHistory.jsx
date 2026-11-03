import { useCallback, useEffect, useState } from 'react'
import { getSubjectSessions } from '../../api'

export default function AttendanceHistory({ subjectId, subject, navigate }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  const loadSessions = useCallback(async () => {
    if (!subjectId) return
    setLoading(true)
    setError(null)
    try {
      const data = await getSubjectSessions(subjectId)
      setSessions(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load session history')
    } finally {
      setLoading(false)
    }
  }, [subjectId])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  const filteredSessions = sessions.filter((s) => {
    const term = search.toLowerCase()
    return (
      (s.session_date && s.session_date.toLowerCase().includes(term)) ||
      (s.method && s.method.toLowerCase().includes(term)) ||
      (s.status && s.status.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate('subject-dashboard', { subjectId, subject })}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        <button
          onClick={() => navigate('start-session', { subjectId, subject })}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Attendance Session
        </button>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Attendance Session History
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {subject?.name || 'Class Subject'} ({subject?.code || ''}) · Section {subject?.section || 'Default'}
            </p>
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by date, method..."
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadSessions} className="rounded bg-red-500/20 px-3 py-1 text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800/40" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center text-sm text-slate-400">
          No attendance sessions found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60 shadow-xl">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-700 bg-slate-800/90 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Session Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSessions.map((sess) => {
                const present = sess.present_count ?? 0
                const total = sess.total_count ?? 0
                const percent = total > 0 ? Math.round((present / total) * 100) : 0

                return (
                  <tr
                    key={sess.id}
                    onClick={() => navigate('session-review', { sessionId: sess.id, subjectId, session: sess, subject })}
                    className="cursor-pointer transition hover:bg-slate-700/40"
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      {sess.session_date || 'Today'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {sess.start_time || '—'} {sess.end_time ? `to ${sess.end_time}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
                          sess.method === 'group_photo'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {sess.method === 'group_photo' ? 'Group Photo' : 'Live Camera'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className="text-white">{present}</span>
                      <span className="text-slate-400"> / {total}</span>
                      <span className="ml-2 text-xs text-slate-400">({percent}%)</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          sess.status === 'completed' || sess.status === 'finalized'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {sess.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate('session-review', { sessionId: sess.id, subjectId, session: sess, subject })
                        }}
                        className="rounded-lg bg-indigo-600/20 px-3 py-1 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-600 hover:text-white"
                      >
                        View Details →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
