// Module Owner: Krishna Patel (24000131) & Maitra Prajapati (24000493) — Database & GUI
// Admin module to register a new student: capture several webcam samples and
// submit them with enrollment details (Functional Requirement #7).

import { useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import { registerStudent } from '../api'

const SAMPLES_NEEDED = 5

export default function RegisterStudent() {
  const { videoRef, ready, error, captureFrame } = useCamera()
  const [enrollmentNo, setEnrollmentNo] = useState('')
  const [name, setName] = useState('')
  const [classSection, setClassSection] = useState('')
  const [samples, setSamples] = useState([])
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const captureSample = () => {
    const frame = captureFrame()
    if (frame) setSamples((prev) => [...prev, frame])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    setSubmitting(true)
    try {
      const student = await registerStudent({ enrollmentNo, name, classSection, images: samples })
      setMessage({ type: 'success', text: `Registered ${student.name} (${student.enrollment_no})` })
      setSamples([])
      setEnrollmentNo('')
      setName('')
      setClassSection('')
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-xl border border-slate-700 bg-black" />
        {error && <p className="text-sm text-red-400">Camera error: {error}</p>}
        <button
          type="button"
          onClick={captureSample}
          disabled={!ready || samples.length >= SAMPLES_NEEDED}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Capture sample ({samples.length}/{SAMPLES_NEEDED})
        </button>
        <div className="flex gap-2 flex-wrap">
          {samples.map((s, i) => (
            <img key={i} src={s} alt={`sample ${i}`} className="h-16 w-16 rounded object-cover border border-slate-700" />
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-sm text-slate-300">
          Enrollment No.
          <input
            required
            value={enrollmentNo}
            onChange={(e) => setEnrollmentNo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Class / Section
          <input
            value={classSection}
            onChange={(e) => setClassSection(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
        </label>

        <button
          type="submit"
          disabled={submitting || samples.length === 0}
          className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? 'Registering...' : 'Register student'}
        </button>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
            {message.text}
          </p>
        )}
      </form>
    </div>
  )
}
