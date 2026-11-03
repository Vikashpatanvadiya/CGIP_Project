import { useCallback, useEffect, useState } from 'react'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../api'

export default function NotificationList({ navigate }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [markingAll, setMarkingAll] = useState(false)

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getNotifications()
      setNotifications(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleMarkAsRead = async (id, isRead) => {
    if (isRead) return
    try {
      await markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      )
    } catch {
      // Ignore or optimistic update
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch (err) {
      alert(err.message || 'Error marking all notifications as read')
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top back navigation & actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate('student-home')}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Student Home
        </button>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Mark All as Read
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Notifications & Alerts</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-400">
                  {unreadCount} unread
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Updates on class attendance sessions, approvals, and reminders
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={loadNotifications} className="font-bold underline">
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-800/40" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <p className="text-sm font-semibold text-slate-300">No notifications</p>
            <p className="mt-1 text-xs text-slate-500">
              You're all caught up! New alerts will show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n) => {
              const isUnread = !n.is_read

              return (
                <div
                  key={n.id}
                  onClick={() => handleMarkAsRead(n.id, n.is_read)}
                  className={`group cursor-pointer rounded-xl border p-4 transition-all duration-150 ${
                    isUnread
                      ? 'border-indigo-500/40 bg-slate-800/80 shadow-md hover:border-indigo-500'
                      : 'border-slate-800/80 bg-slate-900/40 opacity-70 hover:opacity-100 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isUnread
                            ? 'bg-indigo-600/20 text-indigo-400'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                            {n.title}
                          </h4>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                          {n.message}
                        </p>
                        {n.created_at && (
                          <span className="mt-2 block text-[10px] text-slate-500 font-mono">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {isUnread && (
                      <span className="shrink-0 text-[10px] font-semibold text-indigo-400 opacity-0 group-hover:opacity-100 transition">
                        Click to mark read
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
