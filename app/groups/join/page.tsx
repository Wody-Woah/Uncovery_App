'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function JoinGroupPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setJoining(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: groupId } = await supabase
      .rpc('get_group_id_by_invite_code', { code: code.trim() })

    if (!groupId) {
      setError('Invalid invite code. Double-check and try again.')
      setJoining(false)
      return
    }

    const { error: joinError } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: user.id, role: 'member' })

    if (joinError && joinError.code !== '23505') {
      setError('Could not join. Please try again.')
      setJoining(false)
      return
    }

    router.push(`/groups/${groupId}`)
  }

  return (
    <div className="space-y-2">
      <div className="space-y-3">
        <Link href="/groups" className="inline-flex rounded-lg bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25 transition-colors whitespace-nowrap backdrop-blur-sm">
          ← Groups
        </Link>
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-brand-blue text-shadow-hero">Join a Group</h1>
          <p className="text-sm text-white/80 text-shadow-hero mt-1">
            Enter the invite code shared by your group admin.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleJoin}
        className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-5"
      >
        <div>
          <label className="block text-xs uppercase tracking-widest text-steel mb-2">
            Invite code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. XK94TZ"
            maxLength={8}
            className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-steel/30 uppercase tracking-widest font-mono text-lg"
          />
        </div>

        {error && <p className="text-sm text-sunrise">{error}</p>}

        <button
          type="submit"
          disabled={joining || !code.trim()}
          className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-50"
        >
          {joining ? 'Joining…' : 'Join Group'}
        </button>
      </form>
    </div>
  )
}
