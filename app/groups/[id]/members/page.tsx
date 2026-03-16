'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Member = {
  user_id: string
  role: string
  display_name: string
}

type Group = {
  id: string
  name: string
  invite_code: string
  created_by: string
}

export default function MembersPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const [groupRes, membersRes] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name, invite_code, created_by')
          .eq('id', id)
          .single(),
        supabase
          .from('group_members')
          .select('user_id, role')
          .eq('group_id', id),
      ])

      if (!groupRes.data) { router.push('/groups'); return }
      setGroup(groupRes.data)

      const memberIds = (membersRes.data ?? []).map((m: { user_id: string }) => m.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', memberIds)

      const nameMap: Record<string, string> = {}
      profilesData?.forEach((p: { id: string; display_name: string }) => {
        nameMap[p.id] = p.display_name
      })

      const mapped: Member[] = (membersRes.data ?? []).map((m: { user_id: string; role: string }) => ({
        ...m,
        display_name: nameMap[m.user_id] ?? 'Unknown',
      }))

      // Sort: admins first
      mapped.sort((a, b) => (a.role === 'admin' ? -1 : b.role === 'admin' ? 1 : 0))
      setMembers(mapped)
      setLoading(false)
    }

    init()
  }, [id, router])

  async function handleCopyCode() {
    if (!group) return
    await navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleLeave() {
    if (!userId || leaving) return
    setLeaving(true)
    await supabase
      .from('group_members')
      .delete()
      .eq('group_id', id)
      .eq('user_id', userId)
    router.push('/groups')
  }

  if (loading) {
    return <div className="py-20 text-center text-white text-sm text-shadow-hero">Loading…</div>
  }

  const myRole = members.find((m) => m.user_id === userId)?.role

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/groups/${id}`}
          className="text-xs text-white/60 text-shadow-hero hover:text-white/80 transition-colors"
        >
          ← {group?.name}
        </Link>
        <h1 className="text-xl font-semibold text-brand-blue text-shadow-hero mt-1">Members</h1>
      </div>

      {/* Invite code */}
      <div className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm space-y-3">
        <p className="text-xs uppercase tracking-widest text-steel">Invite Code</p>
        <div className="flex items-center gap-3">
          <p className="font-mono text-2xl font-semibold text-charcoal tracking-[0.2em] flex-1">
            {group?.invite_code}
          </p>
          <button
            onClick={handleCopyCode}
            className="rounded-lg border border-steel/20 px-4 py-2 text-sm text-charcoal hover:bg-canvas transition-colors min-w-[80px]"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-muted">Share this code with anyone you&apos;d like to invite.</p>
      </div>

      {/* Member list */}
      <div className="rounded-2xl border border-steel/15 bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-steel/10">
          <p className="text-xs uppercase tracking-widest text-steel">
            {members.length} {members.length === 1 ? 'Member' : 'Members'}
          </p>
        </div>
        <div className="divide-y divide-steel/10">
          {members.map((m) => (
            <div key={m.user_id} className="flex items-center justify-between px-5 py-3.5">
              <p className="text-sm text-charcoal">
                {m.display_name}
                {m.user_id === userId && (
                  <span className="text-muted"> (you)</span>
                )}
              </p>
              {m.role === 'admin' && (
                <span className="text-xs text-steel bg-steel/10 rounded-full px-2.5 py-0.5">
                  Admin
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Leave group — only shown to non-admins */}
      {myRole !== 'admin' && (
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="w-full rounded-xl border border-sunrise/30 px-4 py-3 text-sm font-medium text-sunrise hover:bg-sunrise/5 transition-colors disabled:opacity-50"
        >
          {leaving ? 'Leaving…' : 'Leave Group'}
        </button>
      )}
    </div>
  )
}
