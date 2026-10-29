import { useState } from 'react'
import { registerStudentFace } from '../../api'
import { useCamera } from '../../hooks/useCamera'

const SAMPLES_NEEDED = 3

export default function FaceRegistration({ user, navigate }) {
  const { videoRef, ready, error: cameraError, captureFrame } = useCamera()
  const [enrollmentNo, setEnrollmentNo] = useState('')
  const [name, setName] = useState(user?.name || '')
  const [samples, setSamples] = useState([])
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

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
      setMessage({
        type: 'error',
        text: `Please capture all ${SAMPLES_NEEDED} facial samples before submitting.`,
      })
      return
    }

    setSubmitting(true)
    try {
      const student = await registerStudentFace({
        enrollment_no: enrollmentNo.trim(),
        name: name.trim(),
        images: samples,
      })
      setMessage({
        type: 'success',
        text: `Face ID registered successfully for ${student.name || name} (${student.enrollment_no || enrollmentNo})!`,
      })
      setSamples([])
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Face registration failed.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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

      <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-8 shadow-xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Biometric Face ID Registration
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Train the recognition engine with 3 clear webcam snapshots to enable automated attendance marking.
          </p>
        </div>

        {/* Guidance tips */}
        <div className="mb-6 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs text-indigo-200">
          <div className="font-semibold text-indigo-300 mb-1 flex items-center gap-1.5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Registration Guidelines:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300">
            <li>Ensure proper room lighting with your face clearly visible</li>
            <li>Sample 1: Look straight directly into the camera with neutral expression</li>
            <li>Sample 2 & 3: Turn your head very slightly or smile naturally</li>
          </ul>
        </div>

        {message && (
          <div
            className={`mb-6 rounded-lg border p-4 text-sm flex items-start gap-2 ${
              message.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-400'
            }`}
          >
            <span>{message.text}</span>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Camera View */}
          <div className="space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-700 bg-black shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="h-full w-full object-cover"
              />
              {cameraError && (
                <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-red-400 bg-slate-900/80">
                  Camera error: {cameraError}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={captureSample}
              disabled={!ready || samples.length >= SAMPLES_NEEDED}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Capture Face Sample ({samples.length}/{SAMPLES_NEEDED})
            </button>

            {/* Thumbnail preview strip */}
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((idx) => {
                const sample = samples[idx]
                return (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl border border-slate-700 bg-slate-800/60 overflow-hidden flex items-center justify-center"
                  >
                    {sample ? (
                      <>
                        <img src={sample} alt={`Sample ${idx + 1}`} className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeSample(idx)}
                          className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-600/90 text-white text-[10px] flex items-center justify-center hover:bg-red-500 shadow"
                          title="Remove snapshot"
                        >
                          ✕
                        </button>
                        <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] text-white">
                          #{idx + 1}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">Sample {idx + 1}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Student Form Details */}
          <form onSubmit={handleSubmit} className="flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  University Enrollment Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={enrollmentNo}
                  onChange={(e) => setEnrollmentNo(e.target.value)}
                  placeholder="e.g. 24000123"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-xs text-slate-400">
                <span className="font-semibold text-slate-300 block mb-1">Face Embeddings Storage:</span>
                Your face photos will be processed into local ArcFace mathematical vectors for classroom recognition. Raw image files are not permanently stored.
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || samples.length < SAMPLES_NEEDED}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Processing Biometrics...</span>
                </>
              ) : (
                <span>Register Face ID Embeddings</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
