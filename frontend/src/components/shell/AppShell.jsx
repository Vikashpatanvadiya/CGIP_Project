// Module Owner: Krishna Patel (24000131) — Database & GUI
// App layout: fixed left sidebar (brand + navigation) + top bar (profile).
// Mirrors the markany portal wireframe. Faculty can act; students view only.

import { useState } from 'react'
import Logo, { LogoMark } from './Logo'

// Which nav key owns a given router page (so the right item stays highlighted
// even when you drill into a sub-screen like session-review or start-session).
const FACULTY_SECTION = {
  'faculty-today': 'today',
  'faculty-home': 'today',
  'start-session': 'today',
  'live-session': 'today',
  'group-photo-session': 'today',
  'self-mark-monitor': 'today',
  'session-review': 'today',
  subjects: 'subjects',
  'subject-dashboard': 'subjects',
  'create-subject': 'subjects',
  'student-details': 'students',
  results: 'results',
  attendance: 'attendance',
  'attendance-history': 'attendance',
  'timetable-import': 'timetable',
}

const STUDENT_SECTION = {
  'student-home': 'today',
  dashboard: 'today',
  'student-self-mark': 'today',
  'student-attendance': 'attendance',
  'student-results': 'results',
  'student-timetable': 'timetable',
  'face-registration': 'face',
  'join-class': 'join',
  notifications: 'today',
}

const FACULTY_NAV = [
  { key: 'today', label: 'Today', page: 'faculty-today' },
  { key: 'subjects', label: 'My Subjects', page: 'subjects' },
  { key: 'students', label: 'Student Details', page: 'student-details' },
  { key: 'results', label: 'Result', page: 'results' },
  { key: 'attendance', label: 'Attendance', page: 'attendance' },
  { key: 'timetable', label: 'Time Table', page: 'timetable-import' },
]

const STUDENT_NAV = [
  { key: 'today', label: 'Today', page: 'student-home' },
  { key: 'attendance', label: 'My Attendance', page: 'student-attendance' },
  { key: 'results', label: 'My Result', page: 'student-results' },
  { key: 'timetable', label: 'Time Table', page: 'student-timetable' },
  { key: 'face', label: 'Face ID', page: 'face-registration' },
]

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'U'
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function AppShell({ user, page, navigate, onLogout, date, onDateChange, children }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const isFaculty = user.role === 'faculty'
  const nav = isFaculty ? FACULTY_NAV : STUDENT_NAV
  const activeKey = (isFaculty ? FACULTY_SECTION : STUDENT_SECTION)[page] || nav[0].key

  const go = (p) => {
    setMobileOpen(false)
    navigate(p)
  }

  const NavList = () => (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = item.key === activeKey
        return (
          <button
            key={item.key}
            onClick={() => go(item.page)}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
              active
                ? 'bg-slate-750 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <span
              className={`h-4 w-0.5 rounded-full transition ${
                active ? 'bg-indigo-500' : 'bg-transparent group-hover:bg-slate-600'
              }`}
            />
            {item.label}
          </button>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-slate-800 bg-slate-950/60 px-4 py-6 lg:flex">
        <button onClick={() => go(nav[0].page)} className="mb-8 flex items-center px-2">
          <Logo className="h-6" />
        </button>
        <NavList />
        <div className="mt-auto space-y-3 pt-6">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white">{user.name}</div>
              <div className="truncate text-[10px] capitalize text-slate-500">{user.role}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-sm font-medium text-slate-400 transition hover:border-red-500/30 hover:text-red-400"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* ---------- Mobile top bar ---------- */}
      <div className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => go(nav[0].page)}>
          <Logo className="h-5" />
        </button>
        <div className="flex items-center gap-2">
          {onDateChange && (
            <input
              type="date"
              value={date || todayStr()}
              onChange={(e) => onDateChange(e.target.value || todayStr())}
              className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-200"
            />
          )}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg border border-slate-700 p-2 text-slate-300"
            aria-label="Menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-y-0 left-0 w-64 bg-slate-950 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo className="h-6" />
              <button onClick={() => setMobileOpen(false)} className="text-slate-500">✕</button>
            </div>
            <NavList />
            <button
              onClick={onLogout}
              className="mt-6 w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-sm font-medium text-slate-400"
            >
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* ---------- Main content ---------- */}
      <div className="lg:pl-60">
        {/* Top bar (profile) — matches wireframe's top-right identity block */}
        <div className="hidden items-center justify-end gap-3 border-b border-slate-800 px-8 py-3.5 lg:flex">
          {onDateChange && (
            <div className="mr-auto flex items-center gap-2">
              <input
                type="date"
                value={date || todayStr()}
                onChange={(e) => onDateChange(e.target.value || todayStr())}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
              />
              {date && date !== todayStr() && (
                <button
                  onClick={() => onDateChange(todayStr())}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Today
                </button>
              )}
            </div>
          )}
          <div className="text-right leading-tight">
            <div className="text-xs font-semibold text-white">{user.name}</div>
            <div className="text-[10px] capitalize text-slate-500">
              {user.role}
              {!isFaculty && ' · view only'}
            </div>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200 ring-1 ring-slate-700">
            {initials(user.name)}
          </span>
        </div>

        <main className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
