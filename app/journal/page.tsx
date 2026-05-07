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
  const [userId, setUserId] = useState<string | null>(null)

  // New entry form state
  const [showNewForm, setShowNewForm] = useState(false)
  const [newNoteText, setNewNoteText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      setUserId(user.id)

      const { data } = await supabase
        .from('devotion_notes')
        .select('id, month, day, note, selected_text, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setNotes(data ?? [])
      setReady(true)
    }

    init()
  }, [router])

  async function handleNewSave() {
    if (!newNoteText.trim() || !userId) return
    setSaving(true)

    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()

    const { data, error } = await supabase
      .from('devotion_notes')
      .insert({ user_id: userId, month, day, note: newNoteText.trim(), selected_text: null })
      .select('id, month, day, note, selected_text, created_at')
      .single()

    if (!error && data) {
      setNotes((prev) => [data, ...prev])
    }

    setNewNoteText('')
    setShowNewForm(false)
    setSaving(false)
  }

  function handleNewCancel() {
    setNewNoteText('')
    setShowNewForm(false)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this note?')) return
    setDeletingId(id)
    await supabase.from('devotion_notes').delete().eq('id', id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setDeletingId(null)
  }

  if (!ready) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-5xl font-bold text-brand-blue text-shadow-hero text-center">Journal</h1>
        <div className="h-11 w-full rounded-2xl bg-steel/10 animate-pulse" />
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="rounded-2xl border border-steel/15 bg-white p-5 shadow-sm space-y-3 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-3 w-24 bg-steel/15 rounded" />
                <div className="h-3 w-20 bg-steel/15 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-steel/15 rounded" />
                <div className="h-3 w-5/6 bg-steel/15 rounded" />
                <div className="h-3 w-2/3 bg-steel/15 rounded" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <div className="h-3 w-24 bg-steel/15 rounded" />
                <div className="ml-auto h-3 w-12 bg-steel/15 rounded" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-5xl font-bold text-brand-blue text-shadow-hero text-center">Journal</h1>

      {!showNewForm && (
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-steel px-4 py-3 text-sm font-medium text-white hover:bg-steel/90 transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Entry
        </button>
      )}

      {/* Inline new entry form */}
      {showNewForm && (
        <AnimatedCard>
          <div className="rounded-2xl border border-steel/20 bg-white p-5 shadow-sm space-y-3">
            <p className="text-xs uppercase tracking-widest text-steel">New Journal Entry</p>
            <textarea
              autoFocus
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Write your reflection…"
              rows={5}
              className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-sm text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleNewSave}
                disabled={saving || !newNoteText.trim()}
                className="flex-1 rounded-lg bg-steel px-4 py-2 text-sm font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
              <button
                onClick={handleNewCancel}
                className="rounded-lg border border-steel/20 bg-white px-4 py-2 text-sm font-medium text-charcoal hover:bg-canvas transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </AnimatedCard>
      )}

      {notes.length === 0 && !showNewForm ? (
        <AnimatedCard>
          <div className="rounded-2xl border border-steel/20 bg-white px-8 py-12 text-center shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-charcoal">Welcome to Your Journal</h2>
            <p className="text-sm text-charcoal/80 leading-relaxed">
              This is your private space — a place to capture what stirs in you as you read. Your thoughts, prayers, and reflections belong only to you and are never visible to anyone else.
            </p>
            <p className="text-sm text-muted leading-relaxed">
              Tap <span className="font-medium text-steel">New Entry</span> above to write, or open any devotion and tap <span className="font-medium text-steel">+ Add a Private Journal Entry</span> at the bottom of the page.
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
