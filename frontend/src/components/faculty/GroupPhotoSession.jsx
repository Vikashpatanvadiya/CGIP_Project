import { useRef, useState } from 'react'
import { markSessionGroupPhoto } from '../../api'

export default function GroupPhotoSession({ sessionId, session, subjectId, subject, navigate }) {
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [summary, setSummary] = useState(null)
  const [results, setResults] = useState([])
  const [selectedStudents, setSelectedStudents] = useState({}) // student_id -> boolean
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSummary(null)
    setResults([])
    setSelectedStudents({})
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result)
    reader.readAsDataURL(file)
  }

  const processPhoto = async () => {
    if (!imageSrc || !sessionId) return
    setLoading(true)
    setError(null)
    try {
      const data = await markSessionGroupPhoto(sessionId, imageSrc)
      setSummary(data)
      const resList = data.results || []
      setResults(resList)

      // Initialize selected map with all recognized students as checked
      const initialSelection = {}
      resList.forEach((r) => {
        if (r.student_id) {
          initialSelection[r.student_id] = true
        }
      })
      setSelectedStudents(initialSelection)
    } catch (err) {
      setError(err.message || 'Error processing group photo')
    } finally {
      setLoading(false)
    }
  }

  const drawOverlay = () => {
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!img || !canvas) return

    canvas.width = img.clientWidth
    canvas.height = img.clientHeight
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!img.naturalWidth) return
    const scaleX = canvas.width / img.naturalWidth
    const scaleY = canvas.height / img.naturalHeight

    results.forEach((r) => {
      if (!r.box) return
      const known = r.student_id !== null && r.student_id !== undefined
      ctx.strokeStyle = known ? '#22c55e' : '#ef4444'
      ctx.lineWidth = 2
      ctx.strokeRect(r.box.x * scaleX, r.box.y * scaleY, r.box.w * scaleX, r.box.h * scaleY)

      const label = known ? `${r.name} (${(r.confidence * 100).toFixed(0)}%)` : 'Unknown'
      ctx.fillStyle = known ? '#22c55e' : '#ef4444'
      ctx.font = '14px sans-serif'
      ctx.fillText(label, r.box.x * scaleX, Math.max(12, r.box.y * scaleY - 6))
    })
  }

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }))
  }

  const handleReviewAndFinalize = () => {
    navigate('session-review', { sessionId, session, subjectId, subject })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-400 border border-purple-500/20">
              Group Photo Mode
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
            {subject?.name || 'Class Attendance'}
          </h2>
          <p className="text-xs text-slate-400">
            {subject?.code || ''} · Section {subject?.section || 'Default'} · Session ID: #{sessionId}
          </p>
        </div>

        <button
          onClick={handleReviewAndFinalize}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500"
        >
          Review & Finalize Attendance →
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs text-red-300 font-bold">Dismiss</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Photo Upload and Preview Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Class Photo
                <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
              </label>

              {imageSrc && (
                <button
                  onClick={processPhoto}
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Analyzing Faces...</span>
                    </>
                  ) : (
                    <span>Detect & Recognize Faces</span>
                  )}
                </button>
              )}
            </div>

            {/* Image display */}
            {imageSrc ? (
              <div className="relative w-full overflow-hidden rounded-xl border border-slate-700 bg-black">
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="Classroom Group"
                  className="w-full object-contain"
                  onLoad={drawOverlay}
                />
                <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 p-12 text-center">
                <svg className="h-12 w-12 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h4 className="text-base font-semibold text-white">No classroom photo uploaded yet</h4>
                <p className="mt-1 text-xs text-slate-400 max-w-sm">
                  Upload a photo of your classroom. Our multi-face detector will recognize all enrolled students automatically.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Proposed Attendance List with Checkboxes */}
        <div className="space-y-4">
          {summary && (
            <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-xs">
              <span className="font-semibold text-slate-300">Detection Summary</span>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-slate-900/60 p-2">
                  <div className="text-lg font-bold text-white">{summary.faces_detected}</div>
                  <div className="text-[10px] text-slate-400">Total Faces</div>
                </div>
                <div className="rounded-lg bg-slate-900/60 p-2">
                  <div className="text-lg font-bold text-emerald-400">{summary.recognized}</div>
                  <div className="text-[10px] text-slate-400">Recognized</div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Detected Students</h3>
                <p className="text-xs text-slate-400">Verify checked students before finalize</p>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Upload and process a photo to view recognized faces and attendance marks.
              </div>
            ) : (
              <div className="max-h-[460px] overflow-y-auto space-y-2 pr-1">
                {results.map((r, i) => {
                  const isRecognized = Boolean(r.student_id)
                  const isChecked = selectedStudents[r.student_id] ?? false

                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between rounded-xl border p-3 text-xs transition ${
                        isRecognized
                          ? isChecked
                            ? 'border-emerald-500/40 bg-emerald-950/20'
                            : 'border-slate-700 bg-slate-900/50 opacity-60'
                          : 'border-red-500/30 bg-red-950/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isRecognized ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStudent(r.student_id)}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-400"
                          />
                        ) : (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-400">
                            ?
                          </span>
                        )}
                        <div>
                          <div className={`font-semibold ${isRecognized ? 'text-white' : 'text-red-400'}`}>
                            {r.name || 'Unknown Face'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {r.enrollment_no || 'Unregistered'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            isRecognized
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {(r.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-4 border-t border-slate-700/60 pt-4">
              <button
                onClick={handleReviewAndFinalize}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
              >
                Proceed to Final Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
