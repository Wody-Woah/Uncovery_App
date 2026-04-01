'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function NewGroupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const invite_code = generateInviteCode()

    const groupId = crypto.randomUUID()

    const { error: groupError } = await supabase
      .from('groups')
      .insert({
        id: groupId,
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id,
        invite_code,
      })

    if (groupError) {
      setError('Failed to create group. Please try again.')
      setSaving(false)
      return
    }

    await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: user.id, role: 'admin' })

    router.push(`/groups/${groupId}`)
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="text-center mt-4">
          <h1 className="text-2xl font-semibold text-brand-blue text-shadow-hero">Create a Group</h1>
          <p className="text-sm text-white/80 text-shadow-hero mt-1">
            You&apos;ll get an invite code to share after creating.
          </p>
        </div>
        <Link href="/groups" className="inline-flex rounded-lg bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25 transition-colors whitespace-nowrap backdrop-blur-sm -mt-2">
          ← Groups
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-5"
      >
        <div>
          <label className="block text-xs uppercase tracking-widest text-steel mb-2">
            Group name <span className="text-sunrise">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Morning Readers"
            maxLength={60}
            className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-steel/30"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-widest text-steel mb-2">
            Description{' '}
            <span className="text-muted normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this group about?"
            rows={3}
            maxLength={200}
            className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-steel/30 resize-none"
          />
        </div>

        {error && <p className="text-sm text-sunrise">{error}</p>}

        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create Group'}
        </button>
      </form>
    </div>
  )
}
