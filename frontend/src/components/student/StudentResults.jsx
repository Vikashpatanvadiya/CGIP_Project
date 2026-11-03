// Module Owner: Vikas Patanwadiya (24000605) — GUI
// Student-side Result view. Read-only: students see the marks their faculty
// recorded, grouped by subject.

import { useEffect, useMemo, useState } from 'react'
import { getStudentResults } from '../../api'

function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

export default function StudentResults() {
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStudentResults().then(setResults).catch((e) => setError(e.message))
  }, [])

  const bySubject = useMemo(() => {
    const groups = {}
    ;(results || []).forEach((r) => {
      const key = `${r.subject_code || ''}|${r.subject_name}`
      if (!groups[key]) groups[key] = { name: r.subject_name, code: r.subject_code, rows: [] }
      groups[key].rows.push(r)
    })
    return Object.values(groups)
  }, [results])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">My Result</h2>
        <p className="mt-1 text-sm text-slate-400">Marks your faculty has published for you.</p>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      {results === null && !error && (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800/40" />)}</div>
      )}

      {results && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center">
          <h3 className="text-lg font-semibold text-white">No results yet</h3>
          <p className="mt-1 text-sm text-slate-400">When your faculty records exam marks, they'll show up here.</p>
        </div>
      )}

      {bySubject.map((g, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 bg-slate-800/70 px-4 py-3">
            {g.code && <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400">{g.code}</span>}
            <span className="font-semibold text-white">{g.name}</span>
          </div>
          <div className="divide-y divide-slate-800">
            {g.rows.map((r) => {
              const pct = r.total_marks ? Math.round((r.obtained_marks / r.total_marks) * 100) : null
              return (
                <div key={r.id} className="flex items-center justify-between bg-slate-800/40 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-200">{r.exam_name}</div>
                    {r.exam_date && <div className="text-[10px] text-slate-500">{fmtDate(r.exam_date)}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums text-sm text-white">
                      {r.obtained_marks ?? '—'}{r.total_marks ? <span className="text-slate-500"> / {r.total_marks}</span> : ''}
                    </span>
                    {pct != null && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${pct >= 40 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {pct}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
