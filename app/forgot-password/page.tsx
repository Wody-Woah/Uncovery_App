'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://uncoverydevotional.com/reset-password',
    })

    setLoading(false)

    if (error) {
      setError('Something went wrong. Please try again.')
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white">Reset your password</h1>
          <p className="text-sm text-white/70 mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="rounded-lg bg-steel/10 border border-steel/20 px-4 py-4 text-sm text-steel">
                Check your email for a password reset link. It may take a minute to arrive.
              </div>
              <p className="text-xs text-muted">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-steel hover:underline"
                >
                  try again
                </button>.
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
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-steel px-4 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors disabled:opacity-60"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-white/90 mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
