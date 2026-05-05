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

type LastMessage = {
  content: string
  created_at: string
  user_id: string
  display_name: string
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

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHr < 24) return `${diffHr}h`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function truncate(text: string, max = 42): string {
  const clean = text.replace(/\n+/g, ' ').trim()
  return clean.length > max ? clean.slice(0, max).trimEnd() + '…' : clean
}

const COMMUNITY_RULES = `This is an open community for anyone on the recovery journey. All are welcome here.

To keep this a safe space for everyone:
• Treat every member with kindness and respect
• No harassment, threats, or harmful content
• No sharing of personal contact information
• Keep conversations rooted in support and encouragement
• Lift one another up — we are all on this journey together

Members who do not follow these guidelines may be removed at any time.`

export default function GroupsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [publicGroups, setPublicGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage>>({})
  const [showRulesModal, setShowRulesModal] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([])
  const uidRef = useRef<string | null>(null)

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

  async function fetchLastMessages(uid: string, groupIds: string[]) {
    if (!groupIds.length) return

    const results = await Promise.all(
      groupIds.map((gid) =>
        supabase
          .from('group_messages')
          .select('group_id, content, created_at, user_id')
          .eq('group_id', gid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      )
    )

    const messages = results
      .map((r) => r.data)
      .filter((m): m is NonNullable<typeof m> => m !== null)

    if (!messages.length) return

    const senderIds = Array.from(new Set(messages.map((m) => m.user_id)))
    const { data: names } = await supabase.rpc('get_member_display_names', { member_ids: senderIds })
    const nameMap = Object.fromEntries(
      (names ?? []).map((n: { id: string; display_name: string }) => [n.id, n.display_name])
    )

    const result: Record<string, LastMessage> = {}
    for (const msg of messages) {
      const isMe = msg.user_id === uid
      result[msg.group_id] = {
        content: msg.content,
        created_at: msg.created_at,
        user_id: msg.user_id,
        display_name: isMe ? 'You' : (nameMap[msg.user_id] ?? 'Someone'),
      }
    }
    setLastMessages(result)
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
        }, () => {
          fetchUnreadCounts(uid, groupIds)
          fetchLastMessages(uid, groupIds)
        })
        .subscribe()
    )
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      uidRef.current = user.id
      setUserId(user.id)

      const [memberRows, allPublicRes] = await Promise.all([
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
        supabase.from('groups').select('id, name, description').eq('is_public', true),
      ])

      const groupIds = memberRows.data?.map((r) => r.group_id) ?? []
      const joinedSet = new Set(groupIds)

      // Public groups user hasn't joined — filtered by bans
      const unjoinedPublic = (allPublicRes.data ?? []).filter((g: Group) => !joinedSet.has(g.id))
      if (unjoinedPublic.length > 0) {
        const pubIds = unjoinedPublic.map((g: Group) => g.id)
        const { data: bans } = await supabase
          .from('group_bans')
          .select('group_id')
          .eq('user_id', user.id)
          .in('group_id', pubIds)
        const bannedIds = new Set((bans ?? []).map((b: { group_id: string }) => b.group_id))
        setPublicGroups(unjoinedPublic.filter((g: Group) => !bannedIds.has(g.id)))
      }

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
      fetchLastMessages(user.id, groupIds)
      setupChannels(user.id, groupIds)
    }

    init()

    return () => {
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  useEffect(() => {
    function handleGroupRead(e: Event) {
      const { groupId } = (e as CustomEvent).detail
      setUnreadCounts((prev) => ({ ...prev, [groupId]: 0 }))
    }
    window.addEventListener('uncovery:group-read', handleGroupRead)
    return () => window.removeEventListener('uncovery:group-read', handleGroupRead)
  }, [])

  async function handleJoinPublicGroup(groupId: string) {
    if (!userId || joining) return
    setJoining(true)
    const { data: ban } = await supabase
      .from('group_bans')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle()
    if (ban) { setJoining(false); setShowRulesModal(null); return }
    await supabase.from('group_members').insert({ group_id: groupId, user_id: userId, role: 'member' })
    await supabase.from('group_read_receipts').upsert(
      { user_id: userId, group_id: groupId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,group_id' }
    )
    const joined = publicGroups.find((g) => g.id === groupId)
    if (joined) {
      setGroups((prev) => [joined, ...prev])
      setPublicGroups((prev) => prev.filter((g) => g.id !== groupId))
    }
    setShowRulesModal(null)
    setJoining(false)
  }

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
            <div key={i} className="rounded-2xl border border-steel/15 bg-white p-4 shadow-sm flex items-center gap-4 animate-pulse">
              <div className="h-11 w-11 rounded-full bg-steel/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/5 rounded bg-steel/10" />
                <div className="h-3 w-3/5 rounded bg-steel/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Community rules modal */}
      {showRulesModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-charcoal/50 px-4 pb-4 sm:pb-0"
          onClick={() => setShowRulesModal(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-steel/20 bg-white shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 border-b border-steel/10">
              <p className="text-xs uppercase tracking-widest text-steel mb-1">Before you join</p>
              <h2 className="text-lg font-semibold text-charcoal">Community Guidelines</h2>
            </div>
            <div className="px-6 py-4 max-h-64 overflow-y-auto">
              {COMMUNITY_RULES.split('\n').map((line, i) => (
                <p key={i} className={`text-sm text-charcoal leading-relaxed ${line === '' ? 'mt-3' : ''}`}>
                  {line}
                </p>
              ))}
            </div>
            <div className="px-6 pb-6 pt-2 space-y-2">
              <button
                onClick={() => handleJoinPublicGroup(showRulesModal)}
                disabled={joining}
                className="w-full rounded-xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-60"
              >
                {joining ? 'Joining…' : 'I Agree — Join Community'}
              </button>
              <button
                onClick={() => setShowRulesModal(null)}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-muted hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Open community groups */}
      {publicGroups.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.15em] text-white/70 text-shadow-hero">Open Community</p>
          {publicGroups.map((group, index) => (
            <AnimatedCard key={group.id} delay={index * 0.06}>
              <div className="rounded-2xl border border-steel/15 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${groupColor(group.name)}`}>
                    {groupInitials(group.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-charcoal">{group.name}</p>
                    {group.description && (
                      <p className="text-sm text-muted mt-0.5 line-clamp-2">{group.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowRulesModal(group.id)}
                  className="w-full rounded-xl bg-steel px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-steel/90 transition-colors"
                >
                  Join Community
                </button>
              </div>
            </AnimatedCard>
          ))}
        </div>
      )}

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
          {groups.map((group, index) => {
            const last = lastMessages[group.id]
            return (
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
                    {last ? (
                      <p className="text-sm text-muted mt-0.5 truncate">
                        <span className="font-medium text-charcoal/70">{last.display_name}:</span>{' '}
                        {truncate(last.content)}
                      </p>
                    ) : group.description ? (
                      <p className="text-sm text-muted mt-0.5 line-clamp-1">{group.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {last && (
                      <p className="text-[11px] text-muted">{formatMessageTime(last.created_at)}</p>
                    )}
                    {(unreadCounts[group.id] ?? 0) > 0 && (
                      <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                        {unreadCounts[group.id] > 99 ? '99+' : unreadCounts[group.id]}
                      </span>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-steel/40 shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </AnimatedCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
