'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AnimatedCard from '@/components/AnimatedCard'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY when the user arrives via the reset link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError('Something went wrong. Please try again or request a new reset link.')
    } else {
      setSuccess(true)
      setTimeout(() => { window.location.href = '/dashboard' }, 2500)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30'

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white">Set a new password</h1>
          <p className="text-sm text-white/70 mt-1">Choose a new password for your account.</p>
        </div>

        <AnimatedCard>
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
          {success ? (
            <div className="text-center space-y-3">
              <div className="rounded-lg bg-steel/10 border border-steel/20 px-4 py-4 text-sm text-steel font-medium">
                Password updated successfully!
              </div>
              <p className="text-xs text-muted">Taking you to the app…</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted">Verifying your reset link…</p>
              <p className="text-xs text-muted mt-2">
                If nothing happens,{' '}
                <a href="/forgot-password" className="text-steel hover:underline">
                  request a new link
                </a>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-widest text-steel mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="At least 6 characters"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-steel mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="Repeat new password"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-steel px-4 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors disabled:opacity-60"
              >
                {loading ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
        </AnimatedCard>
      </div>
    </div>
  )
}
