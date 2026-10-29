// Module Owner: Krishna Patel (24000131) — Database & GUI
// Enhanced Subject-Wise Attendance Management System with Auth, Role-based Routing, and Real-time Sessions.

import { useCallback, useEffect, useState } from 'react'
import { clearToken, getMe, getToken } from './api'

// Auth components
import LoginPage from './components/auth/LoginPage'
import RegisterPage from './components/auth/RegisterPage'

// Faculty components
import AttendanceHistory from './components/faculty/AttendanceHistory'
import CreateSubject from './components/faculty/CreateSubject'
import GroupPhotoSession from './components/faculty/GroupPhotoSession'
import LiveSession from './components/faculty/LiveSession'
import SessionReview from './components/faculty/SessionReview'
import StartSession from './components/faculty/StartSession'
import SubjectDashboard from './components/faculty/SubjectDashboard'
import SubjectList from './components/faculty/SubjectList'

// Student components
import FaceRegistration from './components/student/FaceRegistration'
import JoinClass from './components/student/JoinClass'
import NotificationList from './components/student/NotificationList'
import StudentAttendance from './components/student/StudentAttendance'
import StudentHome from './components/student/StudentHome'

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('login')
  const [pageParams, setPageParams] = useState({})
  const [authChecking, setAuthChecking] = useState(true)

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
          setPage(me.role === 'faculty' ? 'subjects' : 'student-home')
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
    if (authenticatedUser.role === 'faculty') {
      navigate('subjects')
    } else {
      navigate('student-home')
    }
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
        <header className="border-b border-slate-800 px-6 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white">
                  A
                </span>
                Subject-Wise Attendance System
              </h1>
              <p className="text-xs text-slate-400">
                Facial Biometric Recognition · CMP513 & CMP514
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('login')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  page === 'login' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('register')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  page === 'register' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
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

  // Authenticated View: Header + Role-based component rendering
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-3.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div
              onClick={() => navigate(user.role === 'faculty' ? 'subjects' : 'student-home')}
              className="cursor-pointer"
            >
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-black text-white shadow-md shadow-indigo-600/30">
                  A
                </span>
                <span className="hidden sm:inline">Subject Attendance</span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Krishna Patel · Maitra Prajapati · Vikas Patanwadiya
              </p>
            </div>

            {/* Quick role-specific top nav tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {user.role === 'faculty' ? (
                <>
                  <button
                    onClick={() => navigate('subjects')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      page === 'subjects' || page === 'subject-dashboard'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    My Subjects
                  </button>
                  <button
                    onClick={() => navigate('create-subject')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      page === 'create-subject'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    + Create Subject
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('student-home')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      page === 'student-home' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => navigate('join-class')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      page === 'join-class' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Join Class
                  </button>
                  <button
                    onClick={() => navigate('student-attendance')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      page === 'student-attendance' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Attendance Log
                  </button>
                  <button
                    onClick={() => navigate('face-registration')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      page === 'face-registration' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Face ID
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-white">{user.name}</div>
                <div className="text-[10px] text-slate-400">{user.email}</div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  user.role === 'faculty'
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
              title="Sign Out"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {/* Faculty Router */}
        {user.role === 'faculty' && (
          <>
            {(page === 'subjects' || page === 'faculty-home') && (
              <SubjectList navigate={navigate} />
            )}
            {page === 'create-subject' && (
              <CreateSubject navigate={navigate} />
            )}
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

        {/* Student Router */}
        {user.role === 'student' && (
          <>
            {(page === 'student-home' || page === 'dashboard') && (
              <StudentHome user={user} navigate={navigate} />
            )}
            {page === 'join-class' && (
              <JoinClass navigate={navigate} />
            )}
            {page === 'student-attendance' && (
              <StudentAttendance
                initialSubjectId={pageParams.subjectId}
                navigate={navigate}
              />
            )}
            {page === 'face-registration' && (
              <FaceRegistration user={user} navigate={navigate} />
            )}
            {page === 'notifications' && (
              <NotificationList navigate={navigate} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
