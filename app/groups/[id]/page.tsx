'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabaseClient'
import { getTodayET } from '@/lib/getTodayET'
import Avatar from '@/components/Avatar'
import AnimatedCard from '@/components/AnimatedCard'

const EMOJIS = ['🙏', '❤️', '👍', '🕊️', '✝️', '💙', '🔥']

type Group = {
  id: string
  name: string
  description: string | null
  created_by: string
  invite_code: string
}

type Message = {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string | null
  display_name: string
}

type TodayDevotion = {
  title: string
  verse_reference: string
  month: number
  day: number
}

type ReactionCounts = Record<string, { count: number; userReacted: boolean }>
type ReactionsMap = Record<string, ReactionCounts>

function buildReactionsMap(
  data: Array<{ message_id: string; user_id: string; emoji: string }>,
  currentUserId: string
): ReactionsMap {
  const map: ReactionsMap = {}
  data.forEach(({ message_id, user_id, emoji }) => {
    if (!map[message_id]) map[message_id] = {}
    if (!map[message_id][emoji]) map[message_id][emoji] = { count: 0, userReacted: false }
    map[message_id][emoji].count++
    if (user_id === currentUserId) map[message_id][emoji].userReacted = true
  })
  return map
}

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const userIdRef = useRef<string | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const namesRef = useRef<Record<string, string>>({})
  const [avatars, setAvatars] = useState<Record<string, string | null>>({})
  const avatarsRef = useRef<Record<string, string | null>>({})
  const [reactions, setReactions] = useState<ReactionsMap>({})
  const [pickerOpen, setPickerOpen] = useState<string | null>(null)
  const [devotion, setDevotion] = useState<TodayDevotion | null>(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { month, day } = getTodayET()

  useEffect(() => { namesRef.current = names }, [names])
  useEffect(() => { avatarsRef.current = avatars }, [avatars])
  useEffect(() => { userIdRef.current = userId }, [userId])

  const scrollToBottom = useCallback(() => {
    const container = chatContainerRef.current
    if (container) container.scrollTop = container.scrollHeight
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      userIdRef.current = user.id

      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', id)
        .eq('user_id', user.id)
        .single()

      if (!membership) { router.push('/groups'); return }

      const [groupRes, membersRes, messagesRes, devotionRes] = await Promise.all([
        supabase.from('groups').select('id, name, description, created_by, invite_code').eq('id', id).single(),
        supabase.from('group_members').select('user_id').eq('group_id', id),
        supabase.from('group_messages').select('id, user_id, content, created_at, updated_at').eq('group_id', id).order('created_at', { ascending: true }).limit(100),
        supabase.from('devotions').select('title, verse_reference, month, day').eq('month', month).eq('day', day).eq('published', true).single(),
      ])

      if (!groupRes.data) { router.push('/groups'); return }
      setGroup(groupRes.data)
      setDevotion(devotionRes.data)

      const memberIds = (membersRes.data ?? []).map((m: { user_id: string }) => m.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', memberIds)

      const nameMap: Record<string, string> = {}
      const avatarMap: Record<string, string | null> = {}
      profilesData?.forEach((p: { id: string; display_name: string; avatar_url: string | null }) => {
        nameMap[p.id] = p.display_name ?? 'Unknown'
        avatarMap[p.id] = p.avatar_url ?? null
      })
      setNames(nameMap)
      namesRef.current = nameMap
      setAvatars(avatarMap)
      avatarsRef.current = avatarMap

      const mapped: Message[] = (messagesRes.data ?? []).map((m: {
        id: string; user_id: string; content: string; created_at: string; updated_at: string | null
      }) => ({ ...m, display_name: nameMap[m.user_id] ?? 'Unknown' }))
      setMessages(mapped)

      // Load reactions for all messages
      const messageIds = mapped.map((m) => m.id)
      if (messageIds.length > 0) {
        const { data: reactionsData } = await supabase
          .from('group_message_reactions')
          .select('message_id, user_id, emoji')
          .in('message_id', messageIds)
        if (reactionsData) setReactions(buildReactionsMap(reactionsData, user.id))
      }

      setLoading(false)

      // Mark all messages as read for this user
      supabase.from('group_read_receipts').upsert(
        { user_id: user.id, group_id: id, last_read_at: new Date().toISOString() },
        { onConflict: 'user_id,group_id' }
      ).then(() => {
        window.dispatchEvent(new CustomEvent('uncovery:group-read', { detail: { groupId: id } }))
      })
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!loading) scrollToBottom()
  }, [loading, messages, scrollToBottom])

  // Realtime: new messages + edits
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`group_messages_${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` },
        async (payload) => {
          const msg = payload.new as { id: string; user_id: string; content: string; created_at: string; updated_at: string | null }
          let display_name = namesRef.current[msg.user_id]
          if (!display_name) {
            const { data } = await supabase
              .from('profiles')
              .select('display_name, avatar_url')
              .eq('id', msg.user_id)
              .single()
            display_name = data?.display_name || 'Unknown'
            setNames((prev) => ({ ...prev, [msg.user_id]: display_name }))
            setAvatars((prev) => ({ ...prev, [msg.user_id]: data?.avatar_url ?? null }))
          }
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev
            return [...prev, { ...msg, display_name }]
          })
          // User is watching — keep their receipt current
          if (userIdRef.current) {
            supabase.from('group_read_receipts').upsert(
              { user_id: userIdRef.current, group_id: id, last_read_at: new Date().toISOString() },
              { onConflict: 'user_id,group_id' }
            ).then(() => {})
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` },
        (payload) => {
          const updated = payload.new as { id: string; content: string; updated_at: string | null }
          setMessages((prev) => prev.map((m) =>
            m.id === updated.id ? { ...m, content: updated.content, updated_at: updated.updated_at } : m
          ))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Realtime: reactions
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`group_reactions_${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_message_reactions' },
        async (payload) => {
          const message_id =
            (payload.new as { message_id?: string })?.message_id ??
            (payload.old as { message_id?: string })?.message_id
          if (!message_id) return

          // Re-fetch reactions for this message to get the authoritative state
          const { data } = await supabase
            .from('group_message_reactions')
            .select('message_id, user_id, emoji')
            .eq('message_id', message_id)

          if (data) {
            const uid = userIdRef.current ?? ''
            const msgReactions: ReactionCounts = {}
            data.forEach(({ user_id, emoji }: { user_id: string; emoji: string }) => {
              if (!msgReactions[emoji]) msgReactions[emoji] = { count: 0, userReacted: false }
              msgReactions[emoji].count++
              if (user_id === uid) msgReactions[emoji].userReacted = true
            })
            setReactions((prev) => ({ ...prev, [message_id]: msgReactions }))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function toggleReaction(messageId: string, emoji: string) {
    if (!userId) return
    const alreadyReacted = reactions[messageId]?.[emoji]?.userReacted ?? false

    // Optimistic update
    setReactions((prev) => {
      const next = { ...prev }
      const msgReactions = { ...(next[messageId] ?? {}) }
      const current = msgReactions[emoji] ?? { count: 0, userReacted: false }
      if (alreadyReacted) {
        const newCount = current.count - 1
        if (newCount <= 0) {
          const { [emoji]: _, ...rest } = msgReactions
          next[messageId] = rest
        } else {
          msgReactions[emoji] = { count: newCount, userReacted: false }
          next[messageId] = msgReactions
        }
      } else {
        msgReactions[emoji] = { count: current.count + 1, userReacted: true }
        next[messageId] = msgReactions
      }
      return next
    })

    setPickerOpen(null)

    if (alreadyReacted) {
      await supabase
        .from('group_message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
    } else {
      await supabase
        .from('group_message_reactions')
        .insert({ message_id: messageId, user_id: userId, emoji })
    }
  }

  function handlePressStart(msgId: string, content: string) {
    longPressTimer.current = setTimeout(() => {
      setEditingId(msgId)
      setEditText(content)
    }, 500)
  }

  function handlePressEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  async function handleEditSave(msgId: string) {
    if (!editText.trim() || !userId) return
    const now = new Date().toISOString()
    const { error } = await supabase
      .from('group_messages')
      .update({ content: editText.trim(), updated_at: now })
      .eq('id', msgId)
      .eq('user_id', userId)
    if (!error) {
      setMessages((prev) => prev.map((m) =>
        m.id === msgId ? { ...m, content: editText.trim(), updated_at: now } : m
      ))
      setEditingId(null)
      setEditText('')
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !userId || sending) return
    setSending(true)
    setPickerOpen(null)
    const { data } = await supabase.from('group_messages').insert({
      group_id: id, user_id: userId, content: text.trim(), month, day,
    }).select('id, user_id, content, created_at').single()
    if (data) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev
        return [...prev, { ...data, updated_at: null, display_name: names[userId] ?? 'You' }]
      })
    }
    setText('')
    setSending(false)
  }

  function formatTime(ts: string) {
    const date = new Date(ts)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    if (isToday) return `Today, ${time}`
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${dateStr}, ${time}`
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl h-12 bg-white/20 animate-pulse" />
        <div className="rounded-2xl min-h-[100px] bg-white/20 animate-pulse" />
        <div className="rounded-2xl border border-steel/15 bg-white shadow-sm overflow-hidden animate-pulse">
          <div className="p-4 min-h-[300px] space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex gap-2 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className="h-8 w-8 rounded-full bg-steel/10 shrink-0 self-end" />
                <div className={`h-12 w-2/3 rounded-2xl bg-steel/10 ${i % 2 === 0 ? 'rounded-bl-sm' : 'rounded-br-sm'}`} />
              </div>
            ))}
          </div>
          <div className="border-t border-steel/10 p-3 flex gap-2">
            <div className="h-10 flex-1 rounded-lg bg-steel/10" />
            <div className="h-10 w-16 rounded-lg bg-steel/10" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header — sticky so group name is always visible */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#1e3a52] to-steel px-4 py-3 shadow-md">
        <h1 className="text-base font-semibold text-white flex-1 text-center">{group?.name}</h1>
        <Link href={`/groups/${id}/members`} className="shrink-0 rounded-lg bg-white/15 border border-white/25 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/25 transition-colors whitespace-nowrap">
          Members →
        </Link>
      </div>

      {/* Invite card — shown to the creator always */}
      {userId === group?.created_by && (
        <AnimatedCard delay={0}>
        <div className="rounded-2xl border border-steel/30 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-steel/10">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-steel">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal">Invite people to your group</p>
              <p className="text-xs text-muted mt-0.5">Share this code with anyone you&apos;d like to invite.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-canvas border border-steel/15 px-4 py-3">
            <p className="font-mono text-xl font-semibold text-charcoal tracking-[0.2em] flex-1">
              {group?.invite_code}
            </p>
            <button
              onClick={async () => {
                if (!group?.invite_code) return
                await navigator.clipboard.writeText(group.invite_code)
                setCodeCopied(true)
                setTimeout(() => setCodeCopied(false), 2000)
              }}
              className="rounded-lg bg-steel px-4 py-2 text-sm font-medium text-white hover:bg-steel/90 transition-colors min-w-[80px]"
            >
              {codeCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        </AnimatedCard>
      )}

      {/* Today's devotion pin */}
      {devotion && (
        <AnimatedCard delay={0.08}>
        <Link
          href={`/today?from=group&groupId=${id}`}
          className="relative rounded-2xl overflow-hidden shadow-sm block min-h-[100px]"
          style={{ willChange: 'transform' }}
        >
          <Image
            src={supabase.storage.from('themes').getPublicUrl(`month-${String(month).padStart(2, '0')}.jpg`).data.publicUrl}
            alt=""
            fill
            sizes="(max-width: 700px) 100vw, 700px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />
          <div className="relative z-10 p-4">
            <p className="text-xs uppercase tracking-widest text-white mb-1">Today&apos;s Devotion</p>
            <p className="font-medium text-white text-sm">{devotion.title}</p>
            <p className="text-xs text-white/80 mt-0.5">{devotion.verse_reference}</p>
          </div>
        </Link>
        </AnimatedCard>
      )}

      {/* Chat */}
      <AnimatedCard delay={0.16}>
      <div className="rounded-2xl border border-steel/15 bg-white shadow-sm overflow-hidden">
        <div ref={chatContainerRef} className="p-4 space-y-4 min-h-[300px] max-h-[50vh] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center text-center py-8 space-y-2">
              <p className="text-charcoal font-medium text-sm">Be the first to share</p>
              <p className="text-muted text-xs leading-relaxed max-w-[240px]">
                What did today&apos;s devotion stir in you? Your reflection might be exactly what someone else needs to hear.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const msgReactions = reactions[msg.id] ?? {}
              const hasReactions = Object.keys(msgReactions).length > 0
              const isOwn = msg.user_id === userId

              return (
                <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} items-end`}>
                  {!isOwn && (
                    <div className="shrink-0 self-end mb-5">
                      <Avatar avatarUrl={avatars[msg.user_id]} displayName={msg.display_name} size="sm" />
                    </div>
                  )}
                  <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    <p className="text-xs text-muted px-1">
                      {isOwn ? 'You' : msg.display_name} · {formatTime(msg.created_at)}
                      {msg.updated_at && <span className="ml-1 italic">(edited)</span>}
                    </p>

                    {/* Edit mode */}
                    {editingId === msg.id ? (
                      <div className="w-full space-y-2">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          autoFocus
                          rows={3}
                          className="w-full rounded-xl border border-steel/30 bg-canvas px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-steel/30 resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setEditingId(null); setEditText('') }}
                            className="rounded-lg border border-steel/20 px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-canvas transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEditSave(msg.id)}
                            disabled={!editText.trim()}
                            className="rounded-lg bg-steel px-3 py-1.5 text-xs font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed select-none ${
                        isOwn ? 'bg-steel text-white rounded-br-sm cursor-pointer active:opacity-80' : 'bg-canvas text-charcoal rounded-bl-sm'
                      }`}
                      onTouchStart={isOwn ? () => handlePressStart(msg.id, msg.content) : undefined}
                      onTouchEnd={isOwn ? handlePressEnd : undefined}
                      onTouchMove={isOwn ? handlePressEnd : undefined}
                      onMouseDown={isOwn ? () => handlePressStart(msg.id, msg.content) : undefined}
                      onMouseUp={isOwn ? handlePressEnd : undefined}
                      onMouseLeave={isOwn ? handlePressEnd : undefined}
                      onContextMenu={isOwn ? (e) => e.preventDefault() : undefined}
                    >
                      {msg.content}
                    </div>
                    )}

                    {/* Reactions */}
                    <div className="flex flex-wrap items-center gap-1 px-1 mt-0.5">
                      {hasReactions && Object.entries(msgReactions).map(([emoji, { count, userReacted }]) => (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs border transition-colors ${
                            userReacted
                              ? 'bg-steel/10 border-steel/30 text-steel font-medium'
                              : 'bg-white border-steel/15 text-charcoal hover:bg-canvas'
                          }`}
                        >
                          {emoji} {count}
                        </button>
                      ))}
                      <button
                        onClick={() => setPickerOpen(pickerOpen === msg.id ? null : msg.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full border border-steel/15 bg-white text-muted text-xs hover:bg-canvas transition-colors"
                      >
                        +
                      </button>
                    </div>

                    {/* Emoji picker */}
                    {pickerOpen === msg.id && (
                      <div className="flex gap-1 p-2 rounded-xl border border-steel/15 bg-white shadow-lg mt-1">
                        {EMOJIS.map((e) => (
                          <button
                            key={e}
                            onClick={() => toggleReaction(msg.id, e)}
                            className="flex-1 text-base flex items-center justify-center py-1 rounded-lg hover:bg-canvas transition-colors"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-steel/10 p-3 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your thoughts…"
            className="flex-1 rounded-lg border border-steel/20 bg-canvas px-3 py-2 text-sm text-charcoal placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-steel/30"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-lg bg-steel px-4 py-2 text-sm font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
      </AnimatedCard>

      {/* Back to Groups — full width at the bottom */}
      <Link
        href="/groups"
        className="block w-full rounded-xl border border-white/20 bg-white/15 px-4 py-3 text-center text-sm font-medium text-white hover:bg-white/25 transition-colors backdrop-blur-sm"
      >
        ← Back to Groups
      </Link>
    </div>
  )
}
