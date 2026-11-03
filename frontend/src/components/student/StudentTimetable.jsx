// Module Owner: Vikas Patanwadiya (24000605) — GUI
// Student-side Time Table. Read-only weekly schedule for the subjects the
// student is enrolled in.

import { useEffect, useMemo, useState } from 'react'
import { getStudentTimetable } from '../../api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function to12h(t) {
  if (!t) return ''
  const [h, m] = String(t).split(':')
  const hour = Number(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m} ${ampm}`
}

export default function StudentTimetable() {
  const [classes, setClasses] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStudentTimetable().then(setClasses).catch((e) => setError(e.message))
  }, [])

  const byDay = useMemo(() => {
    const groups = {}
    ;(classes || []).forEach((c) => {
      const d = c.day_of_week
      if (!groups[d]) groups[d] = []
      groups[d].push(c)
    })
    return groups
  }, [classes])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Time Table</h2>
        <p className="mt-1 text-sm text-slate-400">Your weekly class schedule.</p>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      {classes === null && !error && (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-800/40" />)}</div>
      )}

      {classes && classes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center">
          <h3 className="text-lg font-semibold text-white">No timetable yet</h3>
          <p className="mt-1 text-sm text-slate-400">Once your faculty imports the timetable, your classes will appear here.</p>
        </div>
      )}

      {classes && classes.length > 0 && (
        <div className="space-y-4">
          {DAYS.map((day, idx) => {
            const items = byDay[idx]
            if (!items || items.length === 0) return null
            return (
              <div key={idx}>
                <div className="mb-2 text-sm font-semibold text-indigo-400">{day}</div>
                <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
                  {items.map((c) => (
                    <div key={c.id} className="flex items-center gap-4 bg-slate-800/40 p-3.5">
                      <div className="w-24 shrink-0 text-sm">
                        <div className="font-semibold text-white">{to12h(c.start_time)}</div>
                        <div className="text-xs text-slate-500">{to12h(c.end_time)}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {c.course_code && <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400">{c.course_code}</span>}
                        </div>
                        <div className="mt-0.5 font-semibold text-white">{c.course_name}</div>
                        <div className="text-xs text-slate-400">
                          {c.section ? `Section ${c.section}` : ''}{c.room ? ` · ${c.room}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
