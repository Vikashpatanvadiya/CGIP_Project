// Module Owner: Vikas Patanwadiya (24000605) — GUI & Reports
// Result section: pick a subject + exam, enter each student's marks, save.
// Students see these same marks (read-only) in their own portal.

import { useEffect, useMemo, useState } from 'react'
import {
  deleteSubjectExam,
  getSubjectResults,
  getSubjects,
  saveSubjectResults,
} from '../../api'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function ResultsManager() {
  const [subjects, setSubjects] = useState([])
  const [subjectId, setSubjectId] = useState('')
  const [base, setBase] = useState({ roster: [], exams: [] })
  const [examName, setExamName] = useState('')
  const [examDate, setExamDate] = useState(todayStr())
  const [totalMarks, setTotalMarks] = useState('')
  const [marks, setMarks] = useState({}) // student_user_id -> obtained
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    getSubjects().then((s) => {
      setSubjects(s)
      if (s.length) setSubjectId(String(s[0].id))
    }).catch(() => {})
  }, [])

  // Load roster + exam list whenever the subject changes.
  useEffect(() => {
    if (!subjectId) return
    setLoading(true)
    setStatus(null)
    getSubjectResults(subjectId)
      .then((d) => { setBase(d); resetSheet() })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId])

  const resetSheet = () => {
    setExamName('')
    setExamDate(todayStr())
    setTotalMarks('')
    setMarks({})
  }

  const loadExam = async (name) => {
    setLoading(true)
    setStatus(null)
    try {
      const d = await getSubjectResults(subjectId, name)
      setExamName(d.exam_name)
      setExamDate(d.exam_date || todayStr())
      setTotalMarks(d.total_marks ?? '')
      const next = {}
      d.rows.forEach((r) => {
        if (r.obtained_marks != null) next[r.student_user_id] = String(r.obtained_marks)
      })
      setMarks(next)
    } finally {
      setLoading(false)
    }
  }

  const removeExam = async (name) => {
    if (!window.confirm(`Delete exam "${name}" and all its marks?`)) return
    await deleteSubjectExam(subjectId, name)
    const d = await getSubjectResults(subjectId)
    setBase(d)
    if (examName === name) resetSheet()
  }

  const save = async () => {
    if (!examName.trim()) { setStatus({ type: 'error', msg: 'Enter an exam name first.' }); return }
    setSaving(true)
    setStatus(null)
    try {
      const payload = {
        exam_name: examName.trim(),
        exam_date: examDate || null,
        total_marks: totalMarks === '' ? null : Number(totalMarks),
        marks: base.roster.map((st) => ({
          student_user_id: st.student_user_id,
          obtained_marks: marks[st.student_user_id] ?? '',
        })),
      }
      const res = await saveSubjectResults(subjectId, payload)
      const d = await getSubjectResults(subjectId)
      setBase(d)
      setStatus({ type: 'ok', msg: `Saved marks for ${res.saved} student${res.saved === 1 ? '' : 's'}.` })
    } catch (e) {
      setStatus({ type: 'error', msg: e.message })
    } finally {
      setSaving(false)
    }
  }

  const subject = useMemo(() => subjects.find((s) => String(s.id) === String(subjectId)), [subjects, subjectId])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Result</h2>
        <p className="mt-1 text-sm text-slate-400">Record marks for an exam. Pick a subject, name the exam, then fill in each student.</p>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-800/20 p-12 text-center">
          <h3 className="text-lg font-semibold text-white">No subjects yet</h3>
          <p className="mt-1 text-sm text-slate-400">Create a subject first, then you can record results.</p>
        </div>
      ) : (
        <>
          {/* Controls */}
          <div className="grid gap-3 rounded-xl border border-slate-800 bg-slate-800/40 p-4 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Subject
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
              >
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.code ? `${s.code} · ` : ''}{s.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Exam name
              <input
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. Quiz 1"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Date
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Total marks
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                placeholder="e.g. 60"
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500"
              />
            </label>
          </div>

          {/* Existing exams */}
          {base.exams.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Saved exams:</span>
              {base.exams.map((ex) => (
                <span key={ex.exam_name} className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs">
                  <button onClick={() => loadExam(ex.exam_name)} className={`font-semibold ${examName === ex.exam_name ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`}>
                    {ex.exam_name}
                  </button>
                  <button onClick={() => removeExam(ex.exam_name)} className="text-slate-600 hover:text-red-400" title="Delete exam">✕</button>
                </span>
              ))}
              <button onClick={resetSheet} className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:text-white">+ New exam</button>
            </div>
          )}

          {/* Marks sheet */}
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-800/40" />)}</div>
          ) : base.roster.length === 0 ? (
            <p className="rounded-xl border border-slate-800 bg-slate-800/40 p-6 text-center text-sm text-slate-400">
              No students enrolled in {subject?.name || 'this subject'} yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-800">
              <div className="flex items-center justify-between bg-slate-800/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <span>Student</span>
                <span>Obtained {totalMarks !== '' ? `/ ${totalMarks}` : ''}</span>
              </div>
              <div className="divide-y divide-slate-800">
                {base.roster.map((st) => (
                  <div key={st.student_user_id} className="flex items-center justify-between gap-3 bg-slate-800/40 px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-200">{st.name}</div>
                      <div className="text-[10px] text-slate-500">{st.enrollment_no || st.email}</div>
                    </div>
                    <input
                      type="number"
                      value={marks[st.student_user_id] ?? ''}
                      onChange={(e) => setMarks((m) => ({ ...m, [st.student_user_id]: e.target.value }))}
                      placeholder="—"
                      className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-right text-sm text-white tabular-nums"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {status && (
            <div className={`rounded-lg px-4 py-2 text-sm ${status.type === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {status.msg}
            </div>
          )}

          {base.roster.length > 0 && (
            <div className="flex justify-end">
              <button onClick={save} disabled={saving} className="btn-cream px-5 py-2.5 text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save marks'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
