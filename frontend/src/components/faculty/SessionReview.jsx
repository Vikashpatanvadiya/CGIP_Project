import { useCallback, useEffect, useState } from 'react'
import { finalizeSession, getSession, getSessionAttendance } from '../../api'

export default function SessionReview({ sessionId, session, subjectId, subject, navigate }) {
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [statusMap, setStatusMap] = useState({}) // student_id -> status ('present', 'absent', 'pending_review')
  const [sessionDetail, setSessionDetail] = useState(session || null)
  const [loading, setLoading] = useState(true)
  const [finalizing, setFinalizing] = useState(false)
  const [finalizedSuccess, setFinalizedSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all', 'present', 'absent'

  const loadData = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const [records, sess] = await Promise.all([
        getSessionAttendance(sessionId).catch(() => []),
        getSession(sessionId).catch(() => session),
      ])

      const list = records || []
      setAttendanceRecords(list)
      if (sess) setSessionDetail(sess)

      // Initialize statusMap from server records
      const initialMap = {}
      list.forEach((rec) => {
        initialMap[rec.student_id] = rec.status || 'absent'
      })
      setStatusMap(initialMap)
    } catch (err) {
      setError(err.message || 'Failed to fetch session attendance')
    } finally {
      setLoading(false)
    }
  }, [sessionId, session])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleStatusChange = (studentId, newStatus) => {
    setStatusMap((prev) => ({
      ...prev,
      [studentId]: newStatus,
    }))
  }

  const handleFinalize = async () => {
    setFinalizing(true)
    setError(null)

    const corrections = Object.entries(statusMap).map(([studentId, status]) => ({
      student_id: Number(studentId) || studentId,
      status,
    }))

    try {
      await finalizeSession(sessionId, corrections)
      setFinalizedSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to finalize attendance')
    } finally {
      setFinalizing(false)
    }
  }

  const presentCount = Object.values(statusMap).filter((s) => s === 'present').length
  const absentCount = Object.values(statusMap).filter((s) => s === 'absent').length
  const totalCount = attendanceRecords.length

  const filteredRecords = attendanceRecords.filter((rec) => {
    const currentStatus = statusMap[rec.student_id] || rec.status
    if (filter === 'all') return true
    return currentStatus === filter
  })

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate('subject-dashboard', { subjectId: subjectId || sessionDetail?.subject_id, subject })}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Subject Dashboard
        </button>

        {!finalizedSuccess && (
          <button
            onClick={handleFinalize}
            disabled={finalizing || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {finalizing ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Finalizing...</span>
              </>
            ) : (
              <span>Finalize Attendance</span>
            )}
          </button>
        )}
      </div>

      {finalizedSuccess && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center shadow-xl">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Attendance Finalized & Saved!</h3>
          <p className="mt-1 text-sm text-slate-300">
            Records have been successfully locked and updated. Students can now view their marked attendance.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={() => navigate('subject-dashboard', { subjectId: subjectId || sessionDetail?.subject_id, subject })}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500"
            >
              Return to Subject Dashboard
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="rounded bg-red-500/20 px-3 py-1 text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                Session Review #{sessionId}
              </span>
              <span className="text-xs text-slate-400">
                Method: {sessionDetail?.method === 'group_photo' ? 'Group Photo' : 'Live Camera'}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white">
              {sessionDetail?.subject_name || subject?.name || 'Session Review'}
            </h1>
            <p className="text-xs text-slate-400">
              Date: {sessionDetail?.session_date || 'Today'} · Started at {sessionDetail?.start_time || 'N/A'}
            </p>
          </div>

          {/* Quick Summary Pill Counters */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-center">
              <span className="text-[10px] uppercase tracking-wider text-slate-400">Total</span>
              <div className="text-lg font-bold text-white">{totalCount}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-2 text-center">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400">Present</span>
              <div className="text-lg font-bold text-emerald-400">{presentCount}</div>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-4 py-2 text-center">
              <span className="text-[10px] uppercase tracking-wider text-red-400">Absent</span>
              <div className="text-lg font-bold text-red-400">{absentCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Students ({totalCount})
          </button>
          <button
            onClick={() => setFilter('present')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === 'present' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Present ({presentCount})
          </button>
          <button
            onClick={() => setFilter('absent')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === 'absent' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Absent ({absentCount})
          </button>
        </div>

        <span className="text-xs text-slate-400 hidden sm:inline">
          Faculty manual corrections are highlighted and recorded
        </span>
      </div>

      {/* Attendance Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-800/40"></div>
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center text-sm text-slate-400">
          No student records found matching this filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60 shadow-xl">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="border-b border-slate-700 bg-slate-800/90 text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Enrollment No.</th>
                <th className="px-4 py-3">Recognition Info</th>
                <th className="px-4 py-3">Current Status</th>
                <th className="px-4 py-3 text-right">Quick Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRecords.map((rec) => {
                const currentStatus = statusMap[rec.student_id] || rec.status || 'absent'
                const isManuallyChanged = currentStatus !== (rec.status || 'absent')

                return (
                  <tr
                    key={rec.student_id}
                    className={`transition hover:bg-slate-750 ${
                      isManuallyChanged ? 'bg-indigo-950/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{rec.name}</div>
                      {isManuallyChanged && (
                        <span className="text-[10px] text-amber-400 font-medium">
                          (Modified by Faculty)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {rec.enrollment_no || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {rec.confidence ? (
                        <span className="text-slate-300">
                          {(rec.confidence * 100).toFixed(0)}% conf
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                      {rec.time_in && <span className="ml-2 text-slate-400">· {rec.time_in}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          currentStatus === 'present'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : currentStatus === 'pending_review'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {currentStatus === 'present'
                          ? 'Present ✓'
                          : currentStatus === 'pending_review'
                          ? 'Pending Review ?'
                          : 'Absent ✗'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900/60 p-0.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(rec.student_id, 'present')}
                          className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                            currentStatus === 'present'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(rec.student_id, 'absent')}
                          className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                            currentStatus === 'absent'
                              ? 'bg-red-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(rec.student_id, 'pending_review')}
                          className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                            currentStatus === 'pending_review'
                              ? 'bg-amber-500 text-black'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Review
                        </button>
                      </div>
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
