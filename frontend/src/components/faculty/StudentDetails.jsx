// Module Owner: Vikas Patanwadiya (24000605) — GUI & Reports
// Student Details: a directory of every student enrolled in the faculty's
// subjects, each with quick links to their attendance and results.

import { useEffect, useMemo, useState } from 'react'
import { getFacultyStudents } from '../../api'

export default function StudentDetails({ navigate }) {
  const [students, setStudents] = useState(null)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    getFacultyStudents().then(setStudents).catch((e) => setError(e.message))
  }, [])

  const filtered = useMemo(() => {
    if (!students) return []
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) =>
      [s.name, s.email, s.enrollment_no].filter(Boolean).some((v) => v.toLowerCase().includes(q)),
    )
  }, [students, query])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Student Details</h2>
          <p className="mt-1 text-sm text-slate-400">
            {students ? `${students.length} student${students.length === 1 ? '' : 's'} across your subjects` : 'Loading…'}
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, enrollment…"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 sm:w-72"
        />
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      {students === null && !error && (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800/40" />)}</div>
      )}

      {students && students.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center">
          <h3 className="text-lg font-semibold text-white">No students yet</h3>
          <p className="mt-1 text-sm text-slate-400">When students join your classes they'll appear here.</p>
        </div>
      )}

      {students && students.length > 0 && (
        <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
          {filtered.map((s) => (
            <div key={s.student_user_id} className="flex flex-col gap-3 bg-slate-800/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-slate-200">
                  {s.name?.[0]?.toUpperCase() || 'S'}
                </span>
                <div>
                  <div className="font-semibold text-white">{s.name}</div>
                  <div className="text-xs text-slate-400">
                    {s.enrollment_no ? `Enrollment ${s.enrollment_no}` : 'No face profile yet'}
                    {s.section ? ` · Div ${s.section}` : ''}
                  </div>
                  <div className="text-xs text-slate-500">{s.email}</div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => navigate('attendance')}
                  className="rounded-lg border border-slate-600 bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Attendance
                </button>
                <button
                  onClick={() => navigate('results')}
                  className="rounded-lg border border-slate-600 bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Result
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="bg-slate-800/40 p-6 text-center text-sm text-slate-500">No students match "{query}".</div>
          )}
        </div>
      )}
    </div>
  )
}
