'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getTodayET } from '@/lib/getTodayET'

const EMOJIS = ['🙏', '❤️', '👍', '🕊️', '✝️', '💙', '🔥']

type Group = {
  id: string
  name: string
  description: string | null
  created_by: string
}

type Message = {
  id: string
  user_id: string
  content: string
  created_at: string
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
  const [reactions, setReactions] = useState<ReactionsMap>({})
  const [pickerOpen, setPickerOpen] = useState<string | null>(null)
  const [devotion, setDevotion] = useState<TodayDevotion | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { month, day } = getTodayET()

  useEffect(() => { namesRef.current = names }, [names])
  useEffect(() => { userIdRef.current = userId }, [userId])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
        supabase.from('groups').select('id, name, description, created_by').eq('id', id).single(),
        supabase.from('group_members').select('user_id').eq('group_id', id),
        supabase.from('group_messages').select('id, user_id, content, created_at').eq('group_id', id).order('created_at', { ascending: true }).limit(100),
        supabase.from('devotions').select('title, verse_reference, month, day').eq('month', month).eq('day', day).eq('published', true).single(),
      ])

      if (!groupRes.data) { router.push('/groups'); return }
      setGroup(groupRes.data)
      setDevotion(devotionRes.data)

      const memberIds = (membersRes.data ?? []).map((m: { user_id: string }) => m.user_id)
      const { data: profilesData } = await supabase
        .from('profiles').select('id, display_name').in('id', memberIds)

      const nameMap: Record<string, string> = {}
      profilesData?.forEach((p: { id: string; display_name: string }) => {
        nameMap[p.id] = p.display_name
      })
      setNames(nameMap)
      namesRef.current = nameMap

      const mapped: Message[] = (messagesRes.data ?? []).map((m: {
        id: string; user_id: string; content: string; created_at: string
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
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!loading) scrollToBottom()
  }, [loading, messages, scrollToBottom])

  // Realtime: new messages
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`group_messages_${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` },
        async (payload) => {
          const msg = payload.new as { id: string; user_id: string; content: string; created_at: string }
          let display_name = namesRef.current[msg.user_id]
          if (!display_name) {
            const { data } = await supabase.from('profiles').select('display_name').eq('id', msg.user_id).single()
            display_name = data?.display_name ?? 'Unknown'
            setNames((prev) => ({ ...prev, [msg.user_id]: display_name }))
          }
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev
            return [...prev, { ...msg, display_name }]
          })
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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !userId || sending) return
    setSending(true)
    setPickerOpen(null)
    await supabase.from('group_messages').insert({
      group_id: id, user_id: userId, content: text.trim(), month, day,
    })
    setText('')
    setSending(false)
  }

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  if (loading) {
    return <div className="py-20 text-center text-white text-sm text-shadow-hero">Loading…</div>
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <Link href="/groups" className="text-xs text-white/60 text-shadow-hero hover:text-white/80 transition-colors whitespace-nowrap">
          ← Groups
        </Link>
        <h1 className="text-xl font-semibold text-brand-blue text-shadow-hero text-center">{group?.name}</h1>
        <Link href={`/groups/${id}/members`} className="text-xs text-white/70 text-shadow-hero hover:text-white transition-colors whitespace-nowrap">
          Members →
        </Link>
      </div>

      {/* Today's devotion pin */}
      {devotion && (
        <Link
          href={`/devotion/${devotion.month}/${devotion.day}`}
          className="rounded-2xl border border-steel/20 bg-white p-4 shadow-sm block hover:border-steel/40 transition-colors"
        >
          <p className="text-xs uppercase tracking-widest text-steel mb-1">Today&apos;s Devotion</p>
          <p className="font-medium text-charcoal text-sm">{devotion.title}</p>
          <p className="text-xs text-muted mt-0.5">{devotion.verse_reference}</p>
        </Link>
      )}

      {/* Chat */}
      <div className="rounded-2xl border border-steel/15 bg-white shadow-sm overflow-hidden">
        <div className="p-4 space-y-4 min-h-[300px] max-h-[50vh] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((msg) => {
              const msgReactions = reactions[msg.id] ?? {}
              const hasReactions = Object.keys(msgReactions).length > 0
              const isOwn = msg.user_id === userId

              return (
                <div key={msg.id} className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                  <p className="text-xs text-muted px-1">
                    {isOwn ? 'You' : msg.display_name} · {formatTime(msg.created_at)}
                  </p>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    isOwn ? 'bg-steel text-white rounded-br-sm' : 'bg-canvas text-charcoal rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>

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
    </div>
  )
}
