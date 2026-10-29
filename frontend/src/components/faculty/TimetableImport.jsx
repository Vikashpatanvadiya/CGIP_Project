// Module Owner: Krishna Patel (24000131) & Vikas Patanwadiya (24000605) — Database & GUI
// Paste timetable text (e.g. copied from the university portal) → preview the
// detected classes → import. Each imported course becomes a subject, and each
// time slot becomes a weekly recurring class that shows up on "Today".

import { useState } from 'react'
import { parseTimetable, importTimetable } from '../../api'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function to12h(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hour = Number(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return `${h12}:${m} ${ampm}`
}

export default function TimetableImport({ navigate }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null)
  const [selected, setSelected] = useState({})
  const [step, setStep] = useState('paste') // 'paste' | 'preview'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const handleParse = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await parseTimetable(text)
      const classes = data.classes || []
      setParsed(classes)
      // Pre-select every slot that has a resolvable day + time.
      const sel = {}
      classes.forEach((c, i) => {
        sel[i] = c.day_of_week !== null && c.start_time
      })
      setSelected(sel)
      setStep('preview')
    } catch (err) {
      setError(err.message || 'Could not parse the timetable')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (i) => setSelected((s) => ({ ...s, [i]: !s[i] }))

  const setDay = (i, day) => {
    setParsed((list) => list.map((c, idx) => (idx === i ? { ...c, day_of_week: day, day_name: day !== null ? DAYS[day] : null } : c)))
    if (day !== null) setSelected((s) => ({ ...s, [i]: true }))
  }

  const handleImport = async () => {
    setLoading(true)
    setError(null)
    try {
      const chosen = parsed.filter((_, i) => selected[i] && parsed[i].day_of_week !== null)
      if (chosen.length === 0) {
        setError('Select at least one class with a weekday.')
        setLoading(false)
        return
      }
      const res = await importTimetable(chosen)
      setResult(res)
    } catch (err) {
      setError(err.message || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Timetable imported</h2>
        <p className="text-sm text-slate-300">
          Added <span className="font-bold text-white">{result.imported}</span> class slots across{' '}
          <span className="font-bold text-white">{result.subjects}</span> subjects. They'll appear on your Today view automatically.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <button onClick={() => navigate('faculty-today')} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            Go to Today
          </button>
          <button onClick={() => { setResult(null); setParsed(null); setText(''); setStep('paste') }} className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700">
            Import more
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <button
          onClick={() => navigate('faculty-today')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Today
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Import Timetable</h2>
        <p className="mt-1 text-sm text-slate-400">
          Copy your schedule from the university portal and paste it below. We detect the course code,
          name, section, time, room, and day automatically.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}

      {step === 'paste' && (
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={'Paste here, e.g.\n\nOctober 27, 2026    Tuesday\n2:00pm - 3:00pm  CMP513 Computer Graphics and Image Processing [SECTION 1] [A303 Computer Laboratory] [Yogesh Chaudhari]\n...'}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 font-mono focus:border-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleParse}
            disabled={loading || !text.trim()}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Detecting classes...' : 'Detect classes'}
          </button>
        </div>
      )}

      {step === 'preview' && parsed && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Detected <span className="font-semibold text-white">{parsed.length}</span> slots. Review and import.
            </p>
            <button onClick={() => setStep('paste')} className="text-xs text-indigo-400 hover:text-indigo-300">Edit text</button>
          </div>

          <div className="space-y-2">
            {parsed.map((c, i) => (
              <div
                key={i}
                className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
                  selected[i] ? 'border-indigo-500/40 bg-indigo-950/10' : 'border-slate-700 bg-slate-800/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!selected[i]}
                  onChange={() => toggle(i)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-xs font-bold text-indigo-400">{c.course_code || '—'}</span>
                <span className="flex-1 min-w-[140px] text-sm text-white">{c.course_name || 'Untitled'}</span>
                <span className="text-xs text-slate-400">{c.section ? `Sec ${c.section}` : ''}</span>
                <span className="text-xs text-slate-300">{to12h(c.start_time)}{c.end_time ? `–${to12h(c.end_time)}` : ''}</span>
                {c.day_of_week !== null ? (
                  <span className="rounded bg-slate-700/60 px-2 py-0.5 text-xs text-slate-200">{c.day_name}</span>
                ) : (
                  <select
                    value=""
                    onChange={(e) => setDay(i, e.target.value === '' ? null : Number(e.target.value))}
                    className="rounded border border-amber-500/40 bg-slate-900 px-2 py-0.5 text-xs text-amber-300"
                  >
                    <option value="">Pick day…</option>
                    {DAYS.map((d, di) => <option key={di} value={di}>{d}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleImport}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Import selected classes'}
          </button>
        </div>
      )}
    </div>
  )
}
