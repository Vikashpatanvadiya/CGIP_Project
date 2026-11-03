// Module Owner: Krishna Patel (24000131) & Vikas Patanwadiya (24000605) — Database & GUI
// Faculty uploads one group photo; the backend detects every face, recognizes
// the enrolled students, and marks all of them present in a single action.

import { useRef, useState } from 'react'
import { markAttendanceFromGroupPhoto } from '../api'

export default function GroupPhoto() {
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [summary, setSummary] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setSummary(null)
    setResults([])
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result)
    reader.readAsDataURL(file)
  }

  const processPhoto = async () => {
    if (!imageSrc) return
    setLoading(true)
    setError(null)
    try {
      const data = await markAttendanceFromGroupPhoto(imageSrc)
      setSummary(data)
      setResults(data.results || [])
    } catch (err) {
      setError(err.message)
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
      const known = r.student_id !== null
      ctx.strokeStyle = known ? '#22c55e' : '#ef4444'
      ctx.lineWidth = 2
      ctx.strokeRect(r.box.x * scaleX, r.box.y * scaleY, r.box.w * scaleX, r.box.h * scaleY)

      const label = known ? `${r.name} (${(r.confidence * 100).toFixed(0)}%)` : 'Unknown'
      ctx.fillStyle = known ? '#22c55e' : '#ef4444'
      ctx.font = '14px sans-serif'
      ctx.fillText(label, r.box.x * scaleX, Math.max(12, r.box.y * scaleY - 6))
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <label className="inline-flex w-fit cursor-pointer items-center rounded-lg bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600">
          Choose group photo
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </label>

        {imageSrc && (
          <div className="relative w-full overflow-hidden rounded-xl border border-slate-700">
            <img
              ref={imgRef}
              src={imageSrc}
              alt="group"
              className="w-full"
              onLoad={drawOverlay}
            />
            <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" />
          </div>
        )}

        <button
          onClick={processPhoto}
          disabled={!imageSrc || loading}
          className="w-fit rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Recognizing...' : 'Recognize & mark attendance'}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {summary && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-sm">
            <p className="text-slate-200">
              <span className="font-semibold">{summary.faces_detected}</span> faces detected ·{' '}
              <span className="font-semibold text-emerald-400">{summary.recognized}</span> recognized ·{' '}
              <span className="font-semibold text-indigo-400">{summary.newly_marked}</span> newly marked present
            </p>
          </div>
        )}

        {results.length > 0 && (
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Enrollment</th>
                <th className="pb-2">Confidence</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t border-slate-800">
                  <td className={`py-2 ${r.student_id ? '' : 'text-red-400'}`}>{r.name}</td>
                  <td className="py-2">{r.enrollment_no || '-'}</td>
                  <td className="py-2">{(r.confidence * 100).toFixed(0)}%</td>
                  <td className="py-2">
                    {r.student_id
                      ? r.attendance_marked
                        ? 'Marked ✓'
                        : 'Already present'
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
