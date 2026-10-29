import { useCallback, useEffect, useState } from 'react'
import {
  approveEnrollment,
  deleteSubject,
  getPendingEnrollments,
  getSubject,
  getSubjectRoster,
  getSubjectSessions,
  rejectEnrollment,
} from '../../api'

export default function SubjectDashboard({ subjectId, initialSubject, navigate }) {
  const [subject, setSubject] = useState(initialSubject || null)
  const [activeTab, setActiveTab] = useState('attendance') // 'attendance' or 'students'
  const [roster, setRoster] = useState([])
  const [pendingList, setPendingList] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState({})
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteSubject(subjectId)
      navigate('subjects')
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete subject')
      setDeleting(false)
    }
  }

  const loadData = useCallback(async () => {
    if (!subjectId) return
    setLoading(true)
    setError(null)
    try {
      const [subData, rosterData, pendingData, sessionsData] = await Promise.all([
        getSubject(subjectId).catch(() => initialSubject),
        getSubjectRoster(subjectId).catch(() => []),
        getPendingEnrollments(subjectId).catch(() => []),
        getSubjectSessions(subjectId).catch(() => []),
      ])

      if (subData) setSubject(subData)
      setRoster(rosterData || [])
      setPendingList(pendingData || [])
      setSessions(sessionsData || [])
    } catch (err) {
      setError(err.message || 'Failed to load subject dashboard')
    } finally {
      setLoading(false)
    }
  }, [subjectId, initialSubject])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleApprove = async (enrollmentId) => {
    setActionLoading((prev) => ({ ...prev, [enrollmentId]: 'approving' }))
    try {
      await approveEnrollment(enrollmentId)
      await loadData()
    } catch (err) {
      alert(err.message || 'Error approving enrollment')
    } finally {
      setActionLoading((prev) => ({ ...prev, [enrollmentId]: null }))
    }
  }

  const handleReject = async (enrollmentId) => {
    setActionLoading((prev) => ({ ...prev, [enrollmentId]: 'rejecting' }))
    try {
      await rejectEnrollment(enrollmentId)
      await loadData()
    } catch (err) {
      alert(err.message || 'Error rejecting enrollment')
    } finally {
      setActionLoading((prev) => ({ ...prev, [enrollmentId]: null }))
    }
  }

  const copyJoinCode = () => {
    if (subject?.join_code) {
      navigator.clipboard.writeText(subject.join_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top breadcrumb & actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate('subjects')}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to All Subjects
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
          <button
            onClick={() => navigate('start-session', { subjectId, subject })}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start Attendance Session
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white">Delete this subject?</h3>
            <p className="mt-2 text-sm text-slate-400">
              This permanently removes <span className="font-semibold text-white">{subject?.name}</span> and
              all its sessions, attendance records, enrollments, and timetable slots. This cannot be undone.
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-400">{deleteError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete subject'}
              </button>
            </div>
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

      {/* Subject Info Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/80 p-6 shadow-xl backdrop-blur-md">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-bl-full bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent"></div>

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/20">
                {subject?.code || 'NO-CODE'}
              </span>
              <span className="rounded-md bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-300">
                Section: {subject?.section || 'Default'}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              {subject?.name || 'Loading subject...'}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Capacity: {subject?.capacity || 60} students · Self-registration:{' '}
              {subject?.allow_self_registration !== false ? 'Enabled' : 'Disabled'}
            </p>
          </div>

          {/* Join code widget */}
          <div className="flex flex-col items-start md:items-end gap-1.5 rounded-xl border border-slate-700/80 bg-slate-900/80 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Student Join Code
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-2xl font-bold tracking-widest text-indigo-300">
                {subject?.join_code || '------'}
              </span>
              <button
                onClick={copyJoinCode}
                title="Copy join code"
                className="rounded-lg bg-slate-800 p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              >
                {copied ? (
                  <span className="text-xs text-emerald-400 font-bold">Copied!</span>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-700/60 pt-6 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
            <span className="text-xs text-slate-400">Enrolled Students</span>
            <div className="mt-1 text-xl font-bold text-white">{roster.length}</div>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
            <span className="text-xs text-slate-400">Pending Requests</span>
            <div className="mt-1 text-xl font-bold text-amber-400">{pendingList.length}</div>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
            <span className="text-xs text-slate-400">Total Sessions</span>
            <div className="mt-1 text-xl font-bold text-indigo-400">{sessions.length}</div>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-3">
            <span className="text-xs text-slate-400">Capacity Remaining</span>
            <div className="mt-1 text-xl font-bold text-slate-200">
              {Math.max(0, (subject?.capacity || 60) - roster.length)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-800">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`border-b-2 py-3 text-sm font-semibold transition ${
              activeTab === 'attendance'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Attendance Sessions ({sessions.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`relative border-b-2 py-3 text-sm font-semibold transition ${
              activeTab === 'students'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Roster & Requests ({roster.length})</span>
            {pendingList.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-black">
                {pendingList.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab 1: Attendance Sessions */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Past & Active Sessions</h3>
            <button
              onClick={() => navigate('start-session', { subjectId, subject })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Session
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800/40" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/20 p-8 text-center">
              <svg className="mx-auto h-10 w-10 text-slate-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-medium text-slate-300">No attendance sessions recorded yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Start a live webcam session or upload a group photo to mark student attendance.
              </p>
              <button
                onClick={() => navigate('start-session', { subjectId, subject })}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                Launch First Session
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50">
              <table className="w-full text-left text-sm text-slate-200">
                <thead className="border-b border-slate-700 bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Attendance</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {sessions.map((sess) => {
                    const present = sess.present_count ?? 0
                    const total = sess.total_count ?? roster.length ?? 0
                    const percent = total > 0 ? Math.round((present / total) * 100) : 0

                    return (
                      <tr
                        key={sess.id}
                        onClick={() => navigate('session-review', { sessionId: sess.id, subjectId, session: sess })}
                        className="cursor-pointer transition hover:bg-slate-750 hover:bg-slate-700/30"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">
                            {sess.session_date || 'Today'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {sess.start_time || 'In progress'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                              sess.method === 'group_photo'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {sess.method === 'group_photo' ? 'Group Photo' : 'Live Camera'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-white">{present}</span>
                          <span className="text-slate-400"> / {total}</span>
                          <span className="ml-2 text-xs text-slate-400 font-mono">({percent}%)</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                              navigate('session-review', { sessionId: sess.id, subjectId, session: sess })
                            }}
                            className="rounded-lg bg-indigo-600/20 px-3 py-1 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-600 hover:text-white"
                          >
                            Review
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
      )}

      {/* Tab 2: Students (Pending & Approved Roster) */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Pending Requests Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Pending Enrollment Requests</span>
                {pendingList.length > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                    {pendingList.length}
                  </span>
                )}
              </h3>
            </div>

            {pendingList.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 text-xs text-slate-400">
                No pending requests. Students can request to join using code{' '}
                <span className="font-mono text-indigo-400">{subject?.join_code}</span>.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-amber-500/30 bg-slate-850 bg-slate-900/60">
                <table className="w-full text-left text-sm text-slate-200">
                  <thead className="border-b border-slate-700 bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {pendingList.map((req) => (
                      <tr key={req.id}>
                        <td className="px-4 py-3 font-semibold text-white">
                          {req.student_name || req.name || 'Student'}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {req.student_email || req.email || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                            Pending Approval
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={Boolean(actionLoading[req.id])}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {actionLoading[req.id] === 'approving' ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={Boolean(actionLoading[req.id])}
                            className="rounded-lg bg-red-600/30 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-600 hover:text-white disabled:opacity-50"
                          >
                            {actionLoading[req.id] === 'rejecting' ? '...' : 'Reject'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Approved Roster Section */}
          <div className="space-y-3 pt-2">
            <h3 className="text-base font-bold text-white">
              Approved Class Roster ({roster.length})
            </h3>

            {roster.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-800/20 p-8 text-center text-sm text-slate-400">
                No approved students in this class roster yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50">
                <table className="w-full text-left text-sm text-slate-200">
                  <thead className="border-b border-slate-700 bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">User ID</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {roster.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-750">
                        <td className="px-4 py-3 font-semibold text-white">
                          {st.student_name || st.name}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {st.student_email || st.email || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">
                          {st.student_user_id || st.student_id || st.id}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                            Approved
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
