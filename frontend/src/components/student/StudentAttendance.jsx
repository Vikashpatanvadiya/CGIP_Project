import { useCallback, useEffect, useState } from 'react'
import { getStudentAttendance, getStudentSubjects } from '../../api'

export default function StudentAttendance({ initialSubjectId, navigate }) {
  const [subjects, setSubjects] = useState([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId || '')
  const [records, setRecords] = useState([])
  const [subjectsLoading, setSubjectsLoading] = useState(true)
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [error, setError] = useState(null)

  // 1. Load subjects
  useEffect(() => {
    async function loadSubs() {
      setSubjectsLoading(true)
      try {
        const subs = await getStudentSubjects()
        setSubjects(subs || [])
        if (subs && subs.length > 0) {
          setSelectedSubjectId((prev) => prev || subs[0].id)
        }
      } catch (err) {
        setError(err.message || 'Failed to load enrolled subjects')
      } finally {
        setSubjectsLoading(false)
      }
    }
    loadSubs()
  }, [])

  // 2. Load attendance when selected subject changes
  const loadAttendance = useCallback(async (subId) => {
    if (!subId) return
    setRecordsLoading(true)
    setError(null)
    try {
      const data = await getStudentAttendance(subId)
      setRecords(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load attendance records')
    } finally {
      setRecordsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSubjectId) {
      loadAttendance(selectedSubjectId)
    }
  }, [selectedSubjectId, loadAttendance])

  const currentSubject = subjects.find((s) => String(s.id) === String(selectedSubjectId))

  const totalClasses = records.length
  const presentCount = records.filter((r) => r.status === 'present').length
  const absentCount = totalClasses - presentCount
  const attendanceRate = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 100

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate('student-home')}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Student Home
        </button>

        {/* Subject selector dropdown */}
        {subjectsLoading ? (
          <span className="text-xs text-slate-400">Loading courses...</span>
        ) : subjects.length > 0 ? (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-400">Select Course:</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code || 'No Code'})
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadAttendance(selectedSubjectId)}
            className="rounded bg-red-500/20 px-3 py-1 text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary stats header banner */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/20">
              {currentSubject?.code || 'COURSE'}
            </span>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
              {currentSubject?.name || 'Personal Attendance Log'}
            </h2>
            <p className="text-xs text-slate-400">
              Section: {currentSubject?.section || 'Default'} · Faculty:{' '}
              {currentSubject?.faculty_name || 'Professor'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Total</span>
              <div className="text-xl font-bold text-white">{totalClasses}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-center">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400">Present</span>
              <div className="text-xl font-bold text-emerald-400">{presentCount}</div>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-3 text-center">
              <span className="text-[10px] uppercase tracking-wider text-red-400">Absent</span>
              <div className="text-xl font-bold text-red-400">{absentCount}</div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Rate</span>
              <div
                className={`text-xl font-bold ${
                  attendanceRate >= 75 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {attendanceRate}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white">Session by Session Breakdown</h3>

        {recordsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-800/40" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center text-sm text-slate-400">
            No attendance sessions recorded yet for this subject.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60 shadow-xl">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="border-b border-slate-700 bg-slate-800/90 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time In</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {records.map((rec, i) => {
                  const isPresent = rec.status === 'present'

                  return (
                    <tr key={i} className="hover:bg-slate-750">
                      <td className="px-4 py-3 font-semibold text-white">
                        {rec.session_date || rec.date || 'Today'}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {rec.time_in || rec.time || 'Class Session'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isPresent
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {isPresent ? 'Present ✓' : 'Absent ✗'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-400">
                        {rec.confidence
                          ? `${(rec.confidence * 100).toFixed(0)}%`
                          : isPresent
                          ? 'Manual / 100%'
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
