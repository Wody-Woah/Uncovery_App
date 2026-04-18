'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import AnimatedCard from '@/components/AnimatedCard'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleGoogleSignIn() {
    setGoogleLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push('/dashboard')
    })
  }, [router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(friendlyError(error.message))
      setLoading(false)
    } else {
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
          <p className="text-sm text-white/70 mt-1">Sign in to your account</p>
        </div>

        <AnimatedCard>
        <form
          onSubmit={handleLogin}
          className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-4"
        >
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs uppercase tracking-widest text-steel">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-steel hover:text-charcoal transition-colors">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-steel px-4 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

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
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

function friendlyError(msg: string): string {
  if (msg.toLowerCase().includes('invalid login')) return 'Incorrect email or password.'
  if (msg.toLowerCase().includes('email not confirmed')) return 'Please confirm your email before signing in.'
  return msg
}
