'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Note = {
  id: string
  note: string | null
  selected_text: string | null
  created_at: string
}

type Props = {
  userId: string
  month: number
  day: number
}

export default function DevotionNotes({ userId, month, day }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [showForm, setShowForm] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [showHighlight, setShowHighlight] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from('devotion_notes')
      .select('id, note, selected_text, created_at')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('day', day)
      .order('created_at', { ascending: false })
      .limit(3)
    setNotes(data ?? [])
  }, [userId, month, day])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  async function handleSave() {
    if (!noteText.trim()) return
    setSaving(true)
    await supabase.from('devotion_notes').insert({
      user_id: userId,
      month,
      day,
      note: noteText.trim(),
      selected_text: selectedText.trim() || null,
    })
    setNoteText('')
    setSelectedText('')
    setShowHighlight(false)
    setShowForm(false)
    setSaving(false)
    fetchNotes()
  }

  function handleCancel() {
    setNoteText('')
    setSelectedText('')
    setShowHighlight(false)
    setShowForm(false)
  }

  return (
    <div className="space-y-3 pt-2 border-t border-steel/10">

      {/* Add Note button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-steel/20 bg-canvas px-4 py-2.5 text-sm font-medium text-steel hover:bg-steel/5 transition-colors"
        >
          + Add Note
        </button>
      )}

      {/* Inline form */}
      {showForm && (
        <div className="rounded-xl border border-steel/20 bg-canvas p-4 space-y-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your note…"
            rows={4}
            className="w-full rounded-lg border border-steel/20 bg-white px-3 py-2.5 text-sm text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30 resize-none"
          />

          <button
            type="button"
            onClick={() => setShowHighlight((v) => !v)}
            className="text-xs text-steel hover:underline"
          >
            {showHighlight ? '− Remove highlight' : '+ Add highlight'}
          </button>

          {showHighlight && (
            <input
              type="text"
              value={selectedText}
              onChange={(e) => setSelectedText(e.target.value)}
              placeholder="Paste the highlighted text…"
              className="w-full rounded-lg border border-steel/20 bg-white px-3 py-2 text-sm text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30"
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !noteText.trim()}
              className="flex-1 rounded-lg bg-steel px-4 py-2 text-sm font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Note'}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-lg border border-steel/20 bg-white px-4 py-2 text-sm font-medium text-charcoal hover:bg-canvas transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Recent notes */}
      {notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-steel">Notes</p>
          {notes.map((n) => (
            <div
              key={n.id}
              className="rounded-xl border border-steel/10 bg-canvas p-4 space-y-2"
            >
              {n.selected_text && (
                <p className="text-xs text-muted italic border-l-2 border-steel/30 pl-3 leading-relaxed">
                  {n.selected_text}
                </p>
              )}
              <p className="text-sm text-charcoal leading-relaxed">{n.note}</p>
              <p className="text-[11px] text-muted">
                {new Date(n.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          ))}
          <Link
            href="/journal"
            className="block text-center text-xs text-steel hover:underline pt-1"
          >
            View all in Journal →
          </Link>
        </div>
      )}
    </div>
  )
}
