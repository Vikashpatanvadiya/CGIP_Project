// Module Owner: Krishna Patel (24000131) — Database & GUI
// Attendance report view: pick a date, list who was marked present, export CSV/Excel
// (Functional Requirement #9).

import { useEffect, useState } from 'react'
import { getAttendance, exportUrl } from '../api'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function Reports() {
  const [date, setDate] = useState(today())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getAttendance(date)
      .then(setRows)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [date])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label className="text-sm text-slate-300">
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="ml-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white"
          />
        </label>
        <a href={exportUrl(date, 'csv')} className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600">
          Export CSV
        </a>
        <a href={exportUrl(date, 'xlsx')} className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600">
          Export Excel
        </a>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading...</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <table className="w-full text-left text-sm text-slate-200">
        <thead className="text-slate-400">
          <tr>
            <th className="pb-2">Enrollment No.</th>
            <th className="pb-2">Name</th>
            <th className="pb-2">Time In</th>
            <th className="pb-2">Status</th>
            <th className="pb-2">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-800">
              <td className="py-2">{row.enrollment_no}</td>
              <td className="py-2">{row.name}</td>
              <td className="py-2">{row.time_in}</td>
              <td className="py-2">{row.status}</td>
              <td className="py-2">{row.confidence ? `${Math.round(row.confidence * 100)}%` : '-'}</td>
            </tr>
          ))}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-slate-500">
                No attendance recorded for this date.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
