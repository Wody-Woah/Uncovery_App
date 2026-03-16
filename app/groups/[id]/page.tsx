'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { getTodayET } from '@/lib/getTodayET'

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

export default function GroupChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [group, setGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const namesRef = useRef<Record<string, string>>({})
  const [devotion, setDevotion] = useState<TodayDevotion | null>(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { month, day } = getTodayET()

  // Keep ref in sync with state so realtime callback is never stale
  useEffect(() => {
    namesRef.current = names
  }, [names])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // Verify membership
      const { data: membership } = await supabase
        .from('group_members')
        .select('role')
        .eq('group_id', id)
        .eq('user_id', user.id)
        .single()

      if (!membership) { router.push('/groups'); return }

      // Load group info, member list, messages, and today's devotion in parallel
      const [groupRes, membersRes, messagesRes, devotionRes] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name, description, created_by')
          .eq('id', id)
          .single(),
        supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', id),
        supabase
          .from('group_messages')
          .select('id, user_id, content, created_at')
          .eq('group_id', id)
          .order('created_at', { ascending: true })
          .limit(100),
        supabase
          .from('devotions')
          .select('title, verse_reference, month, day')
          .eq('month', month)
          .eq('day', day)
          .eq('published', true)
          .single(),
      ])

      if (!groupRes.data) { router.push('/groups'); return }
      setGroup(groupRes.data)
      setDevotion(devotionRes.data)

      // Fetch display names for all members
      const memberIds = (membersRes.data ?? []).map((m: { user_id: string }) => m.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', memberIds)

      const nameMap: Record<string, string> = {}
      profilesData?.forEach((p: { id: string; display_name: string }) => {
        nameMap[p.id] = p.display_name
      })
      setNames(nameMap)
      namesRef.current = nameMap

      // Attach display names to messages
      const mapped: Message[] = (messagesRes.data ?? []).map((m: {
        id: string; user_id: string; content: string; created_at: string
      }) => ({
        ...m,
        display_name: nameMap[m.user_id] ?? 'Unknown',
      }))
      setMessages(mapped)
      setLoading(false)
    }

    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // Scroll to bottom on initial load and new messages
  useEffect(() => {
    if (!loading) scrollToBottom()
  }, [loading, messages, scrollToBottom])

  // Realtime subscription for new messages
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
            const { data } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', msg.user_id)
              .single()
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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !userId || sending) return
    setSending(true)
    await supabase.from('group_messages').insert({
      group_id: id,
      user_id: userId,
      content: text.trim(),
      month,
      day,
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
      <div className="flex items-center justify-between">
        <div>
          <Link href="/groups" className="text-xs text-white/60 text-shadow-hero hover:text-white/80 transition-colors">
            ← Groups
          </Link>
          <h1 className="text-xl font-semibold text-brand-blue text-shadow-hero mt-0.5">{group?.name}</h1>
        </div>
        <Link
          href={`/groups/${id}/members`}
          className="text-xs text-white/70 text-shadow-hero hover:text-white transition-colors"
        >
          Members →
        </Link>
      </div>

      {/* Today's devotion pin */}
      {devotion && (
        <Link
          href={`/devotion/${devotion.month}/${devotion.day}`}
          className="rounded-2xl border border-steel/20 bg-white p-4 shadow-sm block hover:border-steel/40 transition-colors"
        >
          <p className="text-xs uppercase tracking-widest text-steel mb-1">Today's Devotion</p>
          <p className="font-medium text-charcoal text-sm">{devotion.title}</p>
          <p className="text-xs text-muted mt-0.5">{devotion.verse_reference}</p>
        </Link>
      )}

      {/* Chat */}
      <div className="rounded-2xl border border-steel/15 bg-white shadow-sm overflow-hidden">
        {/* Message list */}
        <div className="p-4 space-y-4 min-h-[300px] max-h-[50vh] overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-center text-muted text-sm py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-0.5 ${msg.user_id === userId ? 'items-end' : 'items-start'}`}
              >
                <p className="text-xs text-muted px-1">
                  {msg.user_id === userId ? 'You' : msg.display_name} · {formatTime(msg.created_at)}
                </p>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.user_id === userId
                      ? 'bg-steel text-white rounded-br-sm'
                      : 'bg-canvas text-charcoal rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
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
