import { useEffect, useState } from 'react'
import { getStudentFace, registerStudentFace } from '../../api'
import { useCamera } from '../../hooks/useCamera'

const SAMPLES_NEEDED = 3

export default function FaceRegistration({ user, navigate }) {
  const [face, setFace] = useState(null) // { registered, photo, name, enrollment_no }
  const [loadingFace, setLoadingFace] = useState(true)
  const [editing, setEditing] = useState(false)

  const [enrollmentNo, setEnrollmentNo] = useState('')
  const [name, setName] = useState(user?.name || '')
  const [samples, setSamples] = useState([])
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Camera only runs while actually (re)registering.
  const { videoRef, ready, error: cameraError, captureFrame } = useCamera(editing)

  const loadFace = async () => {
    setLoadingFace(true)
    try {
      const data = await getStudentFace()
      setFace(data)
      if (data.registered) {
        setName(data.name || user?.name || '')
        setEnrollmentNo(data.enrollment_no || '')
      }
      // First-time users go straight into capture mode.
      setEditing(!data.registered)
    } catch {
      setEditing(true)
    } finally {
      setLoadingFace(false)
    }
  }

  useEffect(() => {
    loadFace()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const captureSample = () => {
    const frame = captureFrame()
    if (frame && samples.length < SAMPLES_NEEDED) {
      setSamples((prev) => [...prev, frame])
    }
  }

  const removeSample = (idx) => {
    setSamples((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (samples.length < SAMPLES_NEEDED) {
      setMessage({ type: 'error', text: `Please capture all ${SAMPLES_NEEDED} facial samples before submitting.` })
      return
    }

    setSubmitting(true)
    try {
      await registerStudentFace({
        enrollment_no: enrollmentNo.trim(),
        name: name.trim(),
        images: samples,
      })
      setSamples([])
      setMessage(null)
      setEditing(false)
      await loadFace() // refresh to show the newly-saved photo
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Face registration failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  const startEditing = () => {
    setSamples([])
    setMessage(null)
    setEditing(true)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
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

      <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-8 shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white">Biometric Face ID</h2>
          <p className="mt-1 text-sm text-slate-400">
            {face?.registered && !editing
              ? 'Your Face ID is set up. This is the photo the recognition engine uses.'
              : 'Capture 3 clear webcam snapshots to enable automated attendance marking.'}
          </p>
        </div>

        {loadingFace ? (
          <div className="h-56 animate-pulse rounded-xl bg-slate-800/40" />
        ) : face?.registered && !editing ? (
          /* ---------- Registered: show the stored photo + Edit ---------- */
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="relative h-56 w-56 shrink-0 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
              {face.photo ? (
                <img src={face.photo} alt="Your registered face" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-center text-xs text-slate-500">
                  Face ID registered
                  <br />(no preview saved)
                </div>
              )}
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Registered
              </span>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500">Name</div>
                <div className="font-semibold text-white">{face.name || user?.name}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500">Enrollment Number</div>
                <div className="font-mono text-white">{face.enrollment_no || '—'}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-3 text-xs text-slate-400">
                If your appearance changed or recognition is failing, you can re-capture your Face ID.
              </div>
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Face ID
              </button>
            </div>
          </div>
        ) : (
          /* ---------- Capture / re-capture mode ---------- */
          <>
            <div className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs text-indigo-200">
              <div className="mb-1 font-semibold text-indigo-300">Registration Guidelines:</div>
              <ul className="list-inside list-disc space-y-1 text-slate-300">
                <li>Ensure proper room lighting with your face clearly visible</li>
                <li>Sample 1: Look straight into the camera with a neutral expression</li>
                <li>Sample 2 &amp; 3: Turn your head very slightly or smile naturally</li>
              </ul>
            </div>

            {message && (
              <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                {message.text}
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              {/* Camera View */}
              <div className="space-y-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-700 bg-black shadow-inner">
                  <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 p-4 text-center text-xs text-red-400">
                      Camera error: {cameraError}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={captureSample}
                  disabled={!ready || samples.length >= SAMPLES_NEEDED}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Capture Face Sample ({samples.length}/{SAMPLES_NEEDED})
                </button>

                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((idx) => {
                    const sample = samples[idx]
                    return (
                      <div
                        key={idx}
                        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-800/60"
                      >
                        {sample ? (
                          <>
                            <img src={sample} alt={`Sample ${idx + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeSample(idx)}
                              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600/90 text-[10px] text-white shadow hover:bg-red-500"
                              title="Remove snapshot"
                            >
                              ✕
                            </button>
                            <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] text-white">#{idx + 1}</span>
                          </>
                        ) : (
                          <span className="font-mono text-xs text-slate-500">Sample {idx + 1}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      University Enrollment Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={enrollmentNo}
                      onChange={(e) => setEnrollmentNo(e.target.value)}
                      placeholder="e.g. 24000123"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 font-mono text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-xs text-slate-400">
                    <span className="mb-1 block font-semibold text-slate-300">Face Embeddings Storage:</span>
                    Your samples become ArcFace vectors for recognition. One small face thumbnail is kept so you can see what you registered.
                  </div>
                </div>

                <div className="flex gap-2">
                  {face?.registered && (
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setSamples([]); setMessage(null) }}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || samples.length < SAMPLES_NEEDED}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50"
                  >
                    {submitting ? 'Processing Biometrics…' : face?.registered ? 'Save New Face ID' : 'Register Face ID'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
