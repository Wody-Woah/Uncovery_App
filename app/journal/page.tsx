'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import AnimatedCard from '@/components/AnimatedCard'

const MONTHS = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

type JournalNote = {
  id: string
  month: number
  day: number
  note: string | null
  selected_text: string | null
  created_at: string
}

export default function JournalPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [notes, setNotes] = useState<JournalNote[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setReady(true)

      const { data } = await supabase
        .from('devotion_notes')
        .select('id, month, day, note, selected_text, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setNotes(data ?? [])
    }

    init()
  }, [router])

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this note?')) return
    setDeletingId(id)
    await supabase.from('devotion_notes').delete().eq('id', id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setDeletingId(null)
  }

  if (!ready) {
    return <div className="py-20 text-center text-white font-semibold text-sm text-shadow-hero">Loading…</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-blue text-shadow-hero text-center">Journal</h1>

      {notes.length === 0 ? (
        <AnimatedCard>
          <div className="rounded-2xl border border-steel/20 bg-white px-8 py-12 text-center shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-charcoal">Welcome to Your Journal</h2>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              This is your private space — a place to capture what stirs in you as you read. Your thoughts, prayers, and reflections belong only to you and are never visible to anyone else.
            </p>
            <p className="text-sm text-muted leading-relaxed">
              To write your first entry, open any devotion and tap <span className="font-medium text-steel">+ Add a Private Journal Entry</span> at the bottom of the page.
            </p>
          </div>
        </AnimatedCard>
      ) : (
        <ul className="space-y-3">
          {notes.map((n, index) => (
            <li key={n.id}>
              <AnimatedCard delay={index * 0.06}>
                <div className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm space-y-3">
                  {/* Meta row */}
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-widest text-steel">
                      {MONTHS[n.month]} {n.day}
                    </p>
                    <p className="text-[11px] text-muted">
                      {new Date(n.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Highlight */}
                  {n.selected_text && (
                    <p className="text-xs text-muted italic border-l-2 border-steel/30 pl-3 leading-relaxed">
                      {n.selected_text}
                    </p>
                  )}

                  {/* Note text */}
                  {n.note && (
                    <p className="text-sm text-charcoal leading-relaxed">{n.note}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    <Link
                      href={`/devotion/${n.month}/${n.day}`}
                      className="text-xs text-steel hover:underline"
                    >
                      Open devotion →
                    </Link>
                    <button
                      onClick={() => handleDelete(n.id)}
                      disabled={deletingId === n.id}
                      className="ml-auto text-xs text-muted hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      {deletingId === n.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              </AnimatedCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
