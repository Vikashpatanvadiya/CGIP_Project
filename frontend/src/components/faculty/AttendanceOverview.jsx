// Module Owner: Vikas Patanwadiya (24000605) — Attendance & Reports
// Attendance section: every session held, with present/absent counts and a
// Detail view that lists exactly who was present and who was absent.

import { useEffect, useMemo, useState } from 'react'
import { getAttendanceOverview, getSessionDetail } from '../../api'

function fmtDate(d) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

function to12h(t) {
  if (!t) return ''
  const [h, m] = String(t).split(':')
  const hour = Number(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m} ${ampm}`
}

export default function AttendanceOverview({ navigate, date }) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [detail, setDetail] = useState(null) // { row, data, loading }
  const [allDates, setAllDates] = useState(false)

  useEffect(() => {
    getAttendanceOverview().then(setRows).catch((e) => setError(e.message))
  }, [])

  const visibleRows = useMemo(() => {
    if (!rows) return null
    if (allDates || !date) return rows
    return rows.filter((r) => String(r.session_date) === date)
  }, [rows, date, allDates])

  const openDetail = async (row) => {
    setDetail({ row, data: null, loading: true })
    try {
      const data = await getSessionDetail(row.session_id)
      setDetail({ row, data, loading: false })
    } catch (e) {
      setDetail({ row, data: { error: e.message }, loading: false })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Attendance</h2>
          <p className="mt-1 text-sm text-slate-400">
            {allDates || !date ? 'All classes you have taken attendance for.' : `Showing ${fmtDate(date)}.`}
            {' '}Open Detail to see the present and absent list.
          </p>
        </div>
        {date && (
          <button
            onClick={() => setAllDates((v) => !v)}
            className="w-fit rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            {allDates ? 'Filter by selected date' : 'Show all dates'}
          </button>
        )}
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      {rows === null && !error && (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800/40" />)}</div>
      )}

      {visibleRows && visibleRows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center">
          <h3 className="text-lg font-semibold text-white">
            {rows.length === 0 ? 'No attendance yet' : `No attendance on ${fmtDate(date)}`}
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {rows.length === 0
              ? 'Take attendance from the Today screen and it will show up here.'
              : 'Pick another date, or show all dates.'}
          </p>
          {rows.length === 0 ? (
            <button onClick={() => navigate('faculty-today')} className="mt-5 btn-cream px-4 py-2 text-sm">Go to Today</button>
          ) : (
            <button onClick={() => setAllDates(true)} className="mt-5 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700">Show all dates</button>
          )}
        </div>
      )}

      {visibleRows && visibleRows.length > 0 && (
        <div className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
          {visibleRows.map((r) => (
            <div key={r.session_id} className="flex flex-col gap-3 bg-slate-800/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="w-24 shrink-0 text-sm">
                  <div className="font-semibold text-white">{fmtDate(r.session_date)}</div>
                  <div className="text-xs text-slate-500">{to12h(r.start_time)}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400">{r.course_code || 'CLASS'}</span>
                    {r.status === 'active' && <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">Open</span>}
                  </div>
                  <div className="mt-1 font-semibold text-white">{r.subject_name}</div>
                  <div className="text-xs text-slate-400">{r.section ? `Section ${r.section}` : 'Section —'}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex gap-4 text-sm">
                  <span className="text-emerald-400">Present <b className="tabular-nums">{r.present}</b></span>
                  <span className="text-red-400">Absent <b className="tabular-nums">{r.absent}</b></span>
                </div>
                <button
                  onClick={() => openDetail(r)}
                  className="rounded-lg border border-slate-600 bg-slate-700/60 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Detail
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detail && (
        <DetailModal detail={detail} onClose={() => setDetail(null)} />
      )}
    </div>
  )
}

function DetailModal({ detail, onClose }) {
  const { row, data, loading } = detail
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h3 className="font-bold text-white">{row.subject_name} · {row.course_code}</h3>
            <p className="text-xs text-slate-400">{fmtDate(row.session_date)}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
        </div>

        {loading && <div className="p-8 text-center text-sm text-slate-400">Loading…</div>}
        {data?.error && <div className="p-6 text-sm text-red-400">{data.error}</div>}

        {data && !data.error && (
          <div className="grid max-h-[65vh] grid-cols-1 gap-0 overflow-y-auto sm:grid-cols-2">
            <Column title="Present" count={data.present.length} tone="emerald" people={data.present} showTime />
            <Column title="Absent" count={data.absent.length} tone="red" people={data.absent} />
          </div>
        )}
      </div>
    </div>
  )
}

function Column({ title, count, tone, people, showTime }) {
  const toneCls = tone === 'emerald' ? 'text-emerald-400' : 'text-red-400'
  return (
    <div className="border-slate-800 p-4 sm:even:border-l">
      <div className={`mb-3 flex items-center justify-between text-sm font-semibold ${toneCls}`}>
        <span>{title}</span>
        <span className="tabular-nums">{count}</span>
      </div>
      {people.length === 0 ? (
        <p className="text-xs text-slate-600">None</p>
      ) : (
        <ul className="space-y-1.5">
          {people.map((p, i) => (
            <li key={i} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm text-slate-200">{p.name}</div>
                {p.enrollment_no && <div className="text-[10px] text-slate-500">{p.enrollment_no}</div>}
              </div>
              {showTime && p.time_in && <span className="shrink-0 text-[10px] text-slate-500">{String(p.time_in).slice(0, 5)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
