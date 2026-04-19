'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import Avatar from '@/components/Avatar'
import AnimatedCard from '@/components/AnimatedCard'

type Member = {
  user_id: string
  role: string
  display_name: string
  avatar_url: string | null
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
  const [leaving, setLeaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
        .select('id, display_name, avatar_url')
        .in('id', memberIds)

      const profileMap: Record<string, { display_name: string; avatar_url: string | null }> = {}
      profilesData?.forEach((p: { id: string; display_name: string; avatar_url: string | null }) => {
        profileMap[p.id] = { display_name: p.display_name ?? 'Unknown', avatar_url: p.avatar_url ?? null }
      })

      const mapped: Member[] = (membersRes.data ?? []).map((m: { user_id: string; role: string }) => ({
        ...m,
        display_name: profileMap[m.user_id]?.display_name ?? 'Unknown',
        avatar_url: profileMap[m.user_id]?.avatar_url ?? null,
      }))

      // Sort: admins first
      mapped.sort((a, b) => (a.role === 'admin' ? -1 : b.role === 'admin' ? 1 : 0))
      setMembers(mapped)
      setLoading(false)
    }

    init()
  }, [id, router])

  async function handleDelete() {
    if (!userId || deleting) return
    setDeleting(true)
    await supabase.from('groups').delete().eq('id', id)
    router.push('/groups')
  }

  async function handleLeave() {
    if (!userId || leaving) return
    setLeaving(true)
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', id)
      .eq('user_id', userId)
    if (error) {
      setLeaving(false)
      return
    }
    router.push('/groups')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-7 w-32 rounded bg-white/20 animate-pulse" />
        <div className="rounded-2xl border border-steel/15 bg-white shadow-sm overflow-hidden animate-pulse">
          <div className="px-5 py-3 border-b border-steel/10">
            <div className="h-3 w-20 rounded bg-steel/10" />
          </div>
          <div className="divide-y divide-steel/10">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <div className="h-8 w-8 rounded-full bg-steel/10 shrink-0" />
                <div className="h-3 w-32 rounded bg-steel/10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const myRole = members.find((m) => m.user_id === userId)?.role

  return (
    <div className="space-y-6">

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/40 px-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-steel/20 bg-white p-6 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-charcoal">Delete &quot;{group?.name}&quot;?</h2>
              <p className="text-sm text-muted mt-1">
                This will permanently delete the group, all messages, and remove all members. This cannot be undone.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-sunrise px-4 py-2 text-white text-sm font-medium hover:bg-sunrise/90 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete Group'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-sm text-muted hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <Link
          href={`/groups/${id}`}
          className="rounded-lg bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25 transition-colors whitespace-nowrap backdrop-blur-sm"
        >
          ← {group?.name}
        </Link>
        <h1 className="text-xl font-semibold text-brand-blue text-shadow-hero mt-1">Members</h1>
      </div>

      {/* Member list */}
      <AnimatedCard>
        <div className="rounded-2xl border border-steel/15 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-steel/10">
            <p className="text-xs uppercase tracking-widest text-steel">
              {members.length} {members.length === 1 ? 'Member' : 'Members'}
            </p>
          </div>
          <div className="divide-y divide-steel/10">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar avatarUrl={m.avatar_url} displayName={m.display_name} size="sm" />
                  <p className="text-sm text-charcoal">
                    {m.display_name}
                    {m.user_id === userId && (
                      <span className="text-muted"> (you)</span>
                    )}
                  </p>
                </div>
                {m.role === 'admin' && (
                  <span className="text-xs text-steel bg-steel/10 rounded-full px-2.5 py-0.5">
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </AnimatedCard>

      {/* Leave group — only shown to non-admins */}
      {myRole !== 'admin' && (
        <button
          onClick={handleLeave}
          disabled={leaving}
          className="w-full rounded-xl border border-steel/20 bg-white px-4 py-3 text-sm font-medium text-charcoal hover:bg-canvas transition-colors disabled:opacity-50"
        >
          {leaving ? 'Leaving…' : 'Leave Group'}
        </button>
      )}

      {/* Delete group — only shown to the group creator */}
      {userId === group?.created_by && (
        <button
          onClick={() => setShowDeleteModal(true)}
          className="w-full rounded-xl bg-sunrise px-4 py-3 text-sm font-medium text-white hover:bg-sunrise/90 transition-colors"
        >
          Delete Group
        </button>
      )}
    </div>
  )
}
