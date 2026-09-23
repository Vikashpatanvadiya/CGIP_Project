// Module Owner: Krishna Patel (24000131) — Database & GUI

import { useState } from 'react'
import LiveAttendance from './components/LiveAttendance'
import RegisterStudent from './components/RegisterStudent'
import Reports from './components/Reports'

const TABS = [
  { id: 'live', label: 'Live Attendance', component: LiveAttendance },
  { id: 'register', label: 'Register Student', component: RegisterStudent },
  { id: 'reports', label: 'Reports', component: Reports },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('live')
  const ActiveComponent = TABS.find((t) => t.id === activeTab).component

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-4">
        <h1 className="text-xl font-semibold">Facial Attendance Marking System</h1>
        <p className="text-sm text-slate-400">CMP513 + CMP514 — Krishna Patel · Maitra Prajapati · Vikas Patanwadiya</p>
      </header>

      <nav className="flex gap-2 border-b border-slate-800 px-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="p-6">
        <ActiveComponent />
      </main>
    </div>
  )
}
