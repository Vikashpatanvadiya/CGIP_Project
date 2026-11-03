import { useCallback, useEffect, useState } from 'react'
import { getMyEnrollments, joinClass } from '../../api'

export default function JoinClass({ navigate }) {
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [enrollments, setEnrollments] = useState([])
  const [fetchLoading, setFetchLoading] = useState(true)
  const [message, setMessage] = useState(null) // { type: 'success' | 'error', text }

  const loadEnrollments = useCallback(async () => {
    setFetchLoading(true)
    try {
      const data = await getMyEnrollments()
      setEnrollments(data || [])
    } catch {
      // Fallback empty if endpoint not yet seeded
      setEnrollments([])
    } finally {
      setFetchLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEnrollments()
  }, [loadEnrollments])

  const handleJoin = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!joinCode.trim()) {
      setMessage({ type: 'error', text: 'Please enter a valid join code' })
      return
    }

    setLoading(true)
    try {
      const result = await joinClass(joinCode.trim().toUpperCase())
      setMessage({
        type: 'success',
        text: `Request submitted successfully! Status: ${result?.status || 'Pending faculty approval'}.`,
      })
      setJoinCode('')
      loadEnrollments()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to join class. Please verify the join code.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div>
        <button
          onClick={() => navigate('student-home')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Student Home
        </button>
      </div>

      {/* Join Class Card */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-8 shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white">Join a Subject Class</h2>
          <p className="mt-1 text-sm text-slate-400">
            Enter the unique join code provided by your course professor to submit an enrollment request.
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm flex items-start gap-2 ${
              message.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            {message.type === 'success' ? (
              <svg className="h-5 w-5 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Course Join Code
            </label>
            <input
              type="text"
              required
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. CMP513-A or 6-DIGIT CODE"
              className="w-full font-mono uppercase tracking-widest text-center text-lg font-bold rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>Requesting Enrollment...</span>
              </>
            ) : (
              <span>Submit Join Request</span>
            )}
          </button>
        </form>
      </div>

      {/* Existing Enrollments Table */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-white">Your Enrollment History</h3>

        {fetchLoading ? (
          <div className="h-20 animate-pulse rounded-xl bg-slate-800/40" />
        ) : enrollments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-500">
            No class enrollments yet. Enter a join code above to get started.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60">
            <table className="w-full text-left text-sm text-slate-200">
              <thead className="border-b border-slate-700 bg-slate-800/90 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Faculty</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {enrollments.map((enr) => (
                  <tr key={enr.id} className="hover:bg-slate-750">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{enr.subject_name || 'Subject'}</div>
                      <div className="text-xs text-slate-400">{enr.subject_code || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {enr.faculty_name || 'Faculty Member'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {enr.section || 'Default'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          enr.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : enr.status === 'rejected'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {enr.status === 'approved'
                          ? 'Approved ✓'
                          : enr.status === 'rejected'
                          ? 'Rejected ✗'
                          : 'Pending'}
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
  )
}
