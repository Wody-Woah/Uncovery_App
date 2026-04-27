'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import AnimatedCard from '@/components/AnimatedCard'

type Group = {
  id: string
  name: string
  description: string | null
}

const GROUP_COLORS = [
  'bg-[#4f86c6] text-white',
  'bg-[#e07b54] text-white',
  'bg-[#5aab7e] text-white',
  'bg-[#9b6bbf] text-white',
  'bg-[#d4a843] text-white',
  'bg-[#4eadb5] text-white',
  'bg-[#c95f7a] text-white',
  'bg-[#7a8fbf] text-white',
]

function groupColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length]
}

function groupInitials(name: string) {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export default function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([])

  async function fetchUnreadCounts(uid: string, groupIds: string[]) {
    if (!groupIds.length) return

    const { data: receipts } = await supabase
      .from('group_read_receipts')
      .select('group_id, last_read_at')
      .eq('user_id', uid)
      .in('group_id', groupIds)

    const receiptMap = Object.fromEntries(
      (receipts ?? []).map((r: { group_id: string; last_read_at: string }) => [r.group_id, r.last_read_at])
    )

    const counts = await Promise.all(
      groupIds.map(async (gid) => {
        const lastRead = receiptMap[gid]
        if (!lastRead) return { gid, count: 0 }
        const { count } = await supabase
          .from('group_messages')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', gid)
          .neq('user_id', uid)
          .gt('created_at', lastRead)
        return { gid, count: count ?? 0 }
      })
    )

    setUnreadCounts(Object.fromEntries(counts.map(({ gid, count }) => [gid, count])))
  }

  function setupChannels(uid: string, groupIds: string[]) {
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch))
    channelsRef.current = groupIds.map((gid) =>
      supabase
        .channel(`groups_page_unread_${gid}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${gid}`,
        }, () => fetchUnreadCounts(uid, groupIds))
        .subscribe()
    )
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Get group IDs the user belongs to
      const { data: memberRows } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      const groupIds = memberRows?.map((r) => r.group_id) ?? []

      if (groupIds.length === 0) {
        setLoading(false)
        return
      }

      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, name, description')
        .in('id', groupIds)
        .order('created_at', { ascending: false })

      setGroups(groupsData ?? [])
      setLoading(false)

      fetchUnreadCounts(user.id, groupIds)
      setupChannels(user.id, groupIds)
    }

    init()

    return () => {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-5xl font-bold text-brand-blue text-shadow-hero text-center">Small Groups</h1>
          <p className="text-sm text-white/80 text-shadow-hero mt-1 text-center">Read together. Reflect together. Stay connected.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 h-10 rounded-xl bg-white/20 animate-pulse" />
          <div className="flex-1 h-10 rounded-xl bg-white/20 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm space-y-2 animate-pulse">
              <div className="h-4 w-2/5 rounded bg-steel/10" />
              <div className="h-3 w-3/5 rounded bg-steel/10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-5xl font-bold text-brand-blue text-shadow-hero text-center">Small Groups</h1>
        <p className="text-sm text-white/80 text-shadow-hero mt-1 text-center">
          Read together. Reflect together. Stay connected.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/groups/new"
          className="flex-1 rounded-xl bg-steel px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-steel/90 transition-colors"
        >
          Create a group
        </Link>
        <Link
          href="/groups/join"
          className="flex-1 rounded-xl border border-steel/30 bg-white px-4 py-2.5 text-center text-sm font-medium text-charcoal hover:bg-canvas transition-colors"
        >
          Join with code
        </Link>
      </div>

      {groups.length === 0 ? (
        <AnimatedCard>
          <div className="rounded-2xl border border-steel/15 bg-white p-8 shadow-sm space-y-3">
            <p className="text-charcoal font-semibold text-base">You weren&apos;t meant to do this alone.</p>
            <p className="text-muted text-sm leading-relaxed">
              Create a private group for friends, family, or a recovery community. Each day, your group gets a shared space to reflect on the devotion — ask questions, share what&apos;s stirring, and remind each other you&apos;re not doing this alone.
            </p>
          </div>
        </AnimatedCard>
      ) : (
        <div className="space-y-3">
          {groups.map((group, index) => (
            <AnimatedCard key={group.id} delay={index * 0.06}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-center gap-4 rounded-2xl border border-steel/15 bg-white p-4 shadow-sm hover:border-steel/30 hover:shadow-md transition-all"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${groupColor(group.name)}`}>
                  {groupInitials(group.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-charcoal">{group.name}</p>
                  {group.description && (
                    <p className="text-sm text-muted mt-0.5 line-clamp-1">{group.description}</p>
                  )}
                </div>
                {(unreadCounts[group.id] ?? 0) > 0 && (
                  <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none shrink-0">
                    {unreadCounts[group.id] > 99 ? '99+' : unreadCounts[group.id]}
                  </span>
                )}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-steel/40 shrink-0">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </AnimatedCard>
          ))}
        </div>
      )}
    </div>
  )
}
