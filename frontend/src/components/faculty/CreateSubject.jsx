import { useState } from 'react'
import { createSubject } from '../../api'

export default function CreateSubject({ navigate }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [section, setSection] = useState('')
  const [capacity, setCapacity] = useState(60)
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [createdSubject, setCreatedSubject] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Subject Name is required')
      return
    }

    setLoading(true)

    try {
      const subject = await createSubject({
        name: name.trim(),
        code: code.trim(),
        section: section.trim(),
        capacity: Number(capacity) || 60,
        allow_self_registration: allowSelfRegistration,
      })
      setCreatedSubject(subject)
    } catch (err) {
      setError(err.message || 'Failed to create subject')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = () => {
    if (createdSubject?.join_code) {
      navigator.clipboard.writeText(createdSubject.join_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('subjects')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Subjects
        </button>
      </div>

      {createdSubject ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-850 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-white">Subject Created Successfully!</h3>
            <p className="mt-1 text-sm text-slate-400">
              {createdSubject.name} ({createdSubject.code || 'No Code'}) · Section {createdSubject.section || 'Default'}
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-6 text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Share Join Code With Students
            </span>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="font-mono text-3xl font-extrabold tracking-widest text-white">
                {createdSubject.join_code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="rounded-lg bg-indigo-600/30 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600 hover:text-white"
              >
                {copied ? 'Copied ✓' : 'Copy Code'}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Students can use this join code from their portal to request enrollment in this class.
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('subject-dashboard', { subjectId: createdSubject.id, subject: createdSubject })}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
            >
              Open Subject Dashboard
            </button>
            <button
              onClick={() => {
                setCreatedSubject(null)
                setName('')
                setCode('')
                setSection('')
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              Create Another Subject
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-8 shadow-xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-white">Create New Subject</h2>
            <p className="mt-1 text-sm text-slate-400">
              Define the course details and enrollment capacity for your class.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 flex items-start gap-2">
              <svg className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Subject Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Computer Graphics & Image Processing"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Subject Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CMP513"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Section / Batch
                </label>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="e.g. Div A / Batch 1"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Class Capacity
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="mt-1 block text-xs text-slate-400">
                Maximum number of students permitted to enroll.
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <div>
                <span className="block text-sm font-semibold text-white">
                  Allow Student Self-Registration
                </span>
                <span className="text-xs text-slate-400">
                  When enabled, students can submit join requests using the join code.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAllowSelfRegistration((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  allowSelfRegistration ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    allowSelfRegistration ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Creating Subject...</span>
                  </>
                ) : (
                  <span>Create Subject Course</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
