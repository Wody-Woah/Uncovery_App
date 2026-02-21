'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

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
    return <div className="py-20 text-center text-muted text-sm">Loading…</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-charcoal">Journal</h1>

      {notes.length === 0 ? (
        <div className="rounded-2xl border border-steel/20 bg-white p-10 text-center shadow-sm">
          <p className="text-muted text-sm">No notes yet.</p>
          <p className="text-muted text-xs mt-1">
            Add a note while reading a devotion to find it here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm space-y-3"
            >
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
