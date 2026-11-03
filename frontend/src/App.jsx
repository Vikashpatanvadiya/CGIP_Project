// Module Owner: Krishna Patel (24000131) — Database & GUI
// Enhanced Subject-Wise Attendance Management System with Auth, Role-based Routing, and Real-time Sessions.

import { useCallback, useEffect, useState } from 'react'
import { clearToken, getMe, getToken } from './api'
import Logo from './components/shell/Logo'
import AppShell from './components/shell/AppShell'

// Auth components
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'

// Faculty components
import AttendanceHistory from './components/faculty/AttendanceHistory'
import AttendanceOverview from './components/faculty/AttendanceOverview'
import CreateSubject from './components/faculty/CreateSubject'
import FacultyToday from './components/faculty/FacultyToday'
import GroupPhotoSession from './components/faculty/GroupPhotoSession'
import LiveSession from './components/faculty/LiveSession'
import ResultsManager from './components/faculty/ResultsManager'
import SelfMarkMonitor from './components/faculty/SelfMarkMonitor'
import SessionReview from './components/faculty/SessionReview'
import StartSession from './components/faculty/StartSession'
import StudentDetails from './components/faculty/StudentDetails'
import SubjectDashboard from './components/faculty/SubjectDashboard'
import SubjectList from './components/faculty/SubjectList'
import TimetableImport from './components/faculty/TimetableImport'

// Student components
import FaceRegistration from './components/student/FaceRegistration'
import JoinClass from './components/student/JoinClass'
import NotificationList from './components/student/NotificationList'
import StudentAttendance from './components/student/StudentAttendance'
import StudentHome from './components/student/StudentHome'
import StudentResults from './components/student/StudentResults'
import StudentSelfMark from './components/student/StudentSelfMark'
import StudentTimetable from './components/student/StudentTimetable'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('login')
  const [pageParams, setPageParams] = useState({})
  const [authChecking, setAuthChecking] = useState(true)
  const [selectedDate, setSelectedDate] = useState(todayStr())

  // Navigate helper passed as prop
  const navigate = useCallback((targetPage, params = {}) => {
    setPage(targetPage)
    setPageParams(params)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  // Check existing token on mount
  useEffect(() => {
    async function verifyAuth() {
      const token = getToken()
      if (!token) {
        setAuthChecking(false)
        return
      }

      try {
        const me = await getMe()
        if (me && me.id) {
          setUser(me)
          setPage(me.role === 'faculty' ? 'faculty-today' : 'student-home')
        } else {
          clearToken()
          setUser(null)
          setPage('login')
        }
      } catch {
        clearToken()
        setUser(null)
        setPage('login')
      } finally {
        setAuthChecking(false)
      }
    }

    verifyAuth()
  }, [])

  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser)
    navigate(authenticatedUser.role === 'faculty' ? 'faculty-today' : 'student-home')
  }

  const handleLogout = () => {
    clearToken()
    setUser(null)
    setPage('login')
    setPageParams({})
  }

  // Initial token verification spinner
  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-medium text-slate-400">Loading attendance workspace...</span>
        </div>
      </div>
    )
  }

  // Not authenticated view
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <header className="border-b border-slate-800 px-6 py-5">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <button onClick={() => navigate('login')}>
              <Logo className="h-6" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('login')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  page === 'login' ? 'btn-cream' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Login
              </button>
              <button
                onClick={() => navigate('register')}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  page === 'register' ? 'btn-cream' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                Signup
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          {page === 'register' ? (
            <RegisterPage onLoginSuccess={handleLoginSuccess} navigate={navigate} />
          ) : (
            <LoginPage onLoginSuccess={handleLoginSuccess} navigate={navigate} />
          )}
        </main>
      </div>
    )
  }

  // The date control only drives pages that are actually day-scoped.
  const dateAwarePages = new Set([
    'faculty-today', 'faculty-home', 'attendance',
    'student-home', 'dashboard', 'student-attendance',
  ])
  const showDate = dateAwarePages.has(page)

  // Authenticated View: sidebar shell + role-based component rendering
  return (
    <AppShell
      user={user}
      page={page}
      navigate={navigate}
      onLogout={handleLogout}
      date={showDate ? selectedDate : undefined}
      onDateChange={showDate ? setSelectedDate : undefined}
    >
      {/* Faculty Router */}
      {user.role === 'faculty' && (
        <>
          {(page === 'faculty-today' || page === 'faculty-home') && (
            <FacultyToday navigate={navigate} date={selectedDate} onDateChange={setSelectedDate} />
          )}
          {page === 'subjects' && <SubjectList navigate={navigate} />}
          {page === 'student-details' && <StudentDetails navigate={navigate} />}
          {page === 'results' && <ResultsManager navigate={navigate} />}
          {page === 'attendance' && <AttendanceOverview navigate={navigate} date={selectedDate} />}
          {page === 'timetable-import' && <TimetableImport navigate={navigate} />}
          {page === 'create-subject' && <CreateSubject navigate={navigate} />}
          {page === 'subject-dashboard' && (
            <SubjectDashboard
              subjectId={pageParams.subjectId}
              initialSubject={pageParams.subject}
              navigate={navigate}
            />
          )}
          {page === 'start-session' && (
            <StartSession
              subjectId={pageParams.subjectId}
              subject={pageParams.subject}
              date={pageParams.date}
              navigate={navigate}
            />
          )}
          {page === 'live-session' && (
            <LiveSession
              sessionId={pageParams.sessionId}
              session={pageParams.session}
              subjectId={pageParams.subjectId}
              subject={pageParams.subject}
              navigate={navigate}
            />
          )}
          {page === 'group-photo-session' && (
            <GroupPhotoSession
              sessionId={pageParams.sessionId}
              session={pageParams.session}
              subjectId={pageParams.subjectId}
              subject={pageParams.subject}
              navigate={navigate}
            />
          )}
          {page === 'self-mark-monitor' && (
            <SelfMarkMonitor
              sessionId={pageParams.sessionId}
              session={pageParams.session}
              subjectId={pageParams.subjectId}
              subject={pageParams.subject}
              navigate={navigate}
            />
          )}
          {page === 'session-review' && (
            <SessionReview
              sessionId={pageParams.sessionId}
              session={pageParams.session}
              subjectId={pageParams.subjectId}
              subject={pageParams.subject}
              navigate={navigate}
            />
          )}
          {page === 'attendance-history' && (
            <AttendanceHistory
              subjectId={pageParams.subjectId}
              subject={pageParams.subject}
              navigate={navigate}
            />
          )}
        </>
      )}

      {/* Student Router (view-only portal, same shell) */}
      {user.role === 'student' && (
        <>
          {(page === 'student-home' || page === 'dashboard') && (
            <StudentHome user={user} navigate={navigate} date={selectedDate} />
          )}
          {page === 'join-class' && <JoinClass navigate={navigate} />}
          {page === 'student-attendance' && (
            <StudentAttendance initialSubjectId={pageParams.subjectId} navigate={navigate} />
          )}
          {page === 'student-results' && <StudentResults navigate={navigate} />}
          {page === 'student-timetable' && <StudentTimetable navigate={navigate} />}
          {page === 'face-registration' && <FaceRegistration user={user} navigate={navigate} />}
          {page === 'student-self-mark' && (
            <StudentSelfMark
              sessionId={pageParams.sessionId}
              classInfo={pageParams.classInfo}
              navigate={navigate}
            />
          )}
          {page === 'notifications' && <NotificationList navigate={navigate} />}
        </>
      )}
    </AppShell>
  )
}
