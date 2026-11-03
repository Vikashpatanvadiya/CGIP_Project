import { useState } from 'react'
import { loginUser, setToken } from '../../api'

export default function LoginPage({ onLoginSuccess, navigate }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const data = await loginUser(email, password)
      if (data.token) {
        setToken(data.token)
      }
      if (onLoginSuccess && data.user) {
        onLoginSuccess(data.user)
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[82vh] grid items-center gap-12 px-2 py-10 lg:grid-cols-2 lg:gap-20">
      {/* Left: editorial statement */}
      <div className="hidden lg:block">
        <p className="text-sm font-medium text-indigo-400">Facial attendance, done right</p>
        <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.05] text-slate-100">
          Mark a class
          <br />
          <span className="text-slate-500">in a single glance.</span>
        </h1>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-slate-400">
          Students check in on their own camera with a live anti-spoofing check.
          Faculty open a window, review, and finalize — no roll call, no proxies.
        </p>
        <div className="mt-10 flex items-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Live recognition</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-indigo-500" /> Timetable-aware</span>
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-amber-500" /> One-time face setup</span>
        </div>
      </div>

      {/* Right: form */}
      <div className="w-full max-w-md justify-self-center lg:justify-self-end">
        <div className="rounded-3xl border border-slate-700 bg-slate-800 p-8">
          <h2 className="font-display text-2xl font-semibold text-slate-100">Welcome back</h2>
          <p className="mt-1.5 text-sm text-slate-400">Sign in to manage and record attendance.</p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@university.edu or student@univ.edu"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-3 text-sm text-slate-100 placeholder-slate-600 transition focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-3 text-sm text-slate-100 placeholder-slate-600 transition focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-cream mt-2 w-full px-4 py-3 text-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-700 pt-5 text-center text-sm text-slate-400">
            New here?{' '}
            <button
              type="button"
              onClick={() => navigate('register')}
              className="font-semibold text-indigo-400 underline underline-offset-4 transition hover:text-indigo-300"
            >
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
