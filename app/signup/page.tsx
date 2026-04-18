'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import AnimatedCard from '@/components/AnimatedCard'

export default function SignupPage() {
  const router = useRouter()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    const displayName = `${firstName.trim()} ${lastName.trim()}`.trim()

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } }
    })

    if (error) {
      setError(friendlyError(error.message))
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (userId) {
      await supabase
        .from('profiles')
        .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
    }

    if (data.session) {
      window.location.href = '/today'
    } else {
      setNotice('Check your email for a confirmation link, then sign in.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white">
            Create an account
          </h1>
          <p className="text-sm text-white/70 mt-1">
            Start your devotional journey
          </p>
        </div>

        <AnimatedCard>
        <form
          onSubmit={handleSignup}
          className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-4"
        >
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {notice && (
            <div className="rounded-lg bg-steel/10 border border-steel/20 px-4 py-3 text-sm text-steel">
              {notice}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-widest text-steel mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                placeholder="John"
                className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-steel mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
                placeholder="Smith"
                className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30"
              />
            </div>
          </div>

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

          <div>
            <label className="block text-xs uppercase tracking-widest text-steel mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-widest text-steel mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={6}
              placeholder="Re-enter your password"
              className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-steel px-4 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-xs text-muted leading-relaxed">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline hover:text-charcoal transition-colors">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline hover:text-charcoal transition-colors">Privacy Policy</Link>.
          </p>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-steel/15" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-steel/15" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-lg border border-steel/20 bg-white px-4 py-2.5 text-sm font-medium text-charcoal hover:bg-canvas transition-colors disabled:opacity-60"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#4285F4" d="M47.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.3 7.3-10.6 7.3-17.2z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.9-6c-2.1 1.4-4.9 2.3-8 2.3-6.1 0-11.3-4.1-13.2-9.7H2.7v6.2C6.6 42.6 14.7 48 24 48z"/>
              <path fill="#FBBC05" d="M10.8 28.8c-.5-1.4-.8-2.8-.8-4.3s.3-3 .8-4.3v-6.2H2.7C1 17.4 0 20.6 0 24s1 6.6 2.7 9.1l8.1-4.3z"/>
              <path fill="#EA4335" d="M24 9.5c3.4 0 6.5 1.2 8.9 3.5l6.6-6.6C35.9 2.6 30.4 0 24 0 14.7 0 6.6 5.4 2.7 13.2l8.1 4.3C12.7 13.6 17.9 9.5 24 9.5z"/>
            </svg>
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>
        </form>
        </AnimatedCard>

        <p className="text-center text-sm text-white/90 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

function friendlyError(msg: string): string {
  if (msg.toLowerCase().includes('already registered')) return 'An account with this email already exists.'
  if (msg.toLowerCase().includes('password')) return 'Password must be at least 6 characters.'
  return msg
}
