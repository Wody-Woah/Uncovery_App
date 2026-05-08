'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'
import AnimatedCard from '@/components/AnimatedCard'
import { MONTHS } from '@/lib/constants'

type PageStatus = 'loading' | 'unauthorized' | 'not-found' | 'ready'

function daysInMonth(month: number) {
  return new Date(2024, month, 0).getDate()
}

export default function EditDevotionPage() {
  const params = useParams()
  const id = params.id as string

  const [pageStatus, setPageStatus] = useState<PageStatus>('loading')

  const [month, setMonth] = useState(1)
  const [day, setDay] = useState(1)
  const [title, setTitle] = useState('')
  const [verseReference, setVerseReference] = useState('')
  const [verseText, setVerseText] = useState('')
  const [body, setBody] = useState('')
  const [prayer, setPrayer] = useState('')
  const [published, setPublished] = useState(true)

  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        // Redirect handled below — show loading until push
        window.location.href = '/login'
        return
      }

      const admin = await isAdmin()
      if (!admin) {
        setPageStatus('unauthorized')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('devotions')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setPageStatus('not-found')
        return
      }

      setMonth(data.month)
      setDay(data.day)
      setTitle(data.title)
      setVerseReference(data.verse_reference)
      setVerseText(data.verse_text ?? '')
      setBody(data.body)
      setPrayer(data.prayer ?? '')
      setPublished(data.published)
      setPageStatus('ready')
    }

    init()
  }, [id])

  const maxDay = daysInMonth(month)
  const safeDay = day > maxDay ? maxDay : day

  function handleMonthChange(val: number) {
    setMonth(val)
    if (day > daysInMonth(val)) setDay(daysInMonth(val))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setConfirming(true)
  }

  async function saveChanges() {
    setConfirming(false)
    setError(null)
    setSaved(false)
    setSubmitting(true)

    const { error: updateError } = await supabase
      .from('devotions')
      .update({
        month,
        day: safeDay,
        title: title.trim(),
        verse_reference: verseReference.trim(),
        verse_text: verseText.trim() || null,
        body: body.trim(),
        prayer: prayer.trim() || null,
        published,
      })
      .eq('id', id)

    setSubmitting(false)

    if (updateError) {
      if (updateError.code === '23505' || updateError.message.toLowerCase().includes('unique')) {
        setError(
          `Another devotion already exists for ${MONTHS[month - 1]} ${safeDay}. Choose a different date.`
        )
      } else {
        setError(updateError.message)
      }
      return
    }

    setSaved(true)
  }

  // ── Access / loading states ──────────────────────────────────────

  if (pageStatus === 'loading') {
    return (
      <div className="space-y-8">
        <div className="h-7 w-40 rounded bg-white/20 animate-pulse" />
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-5 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-steel/10" />
              <div className={`w-full rounded-lg bg-steel/10 ${i >= 2 ? 'h-24' : 'h-10'}`} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (pageStatus === 'unauthorized') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-white font-semibold text-shadow-hero">Not authorized.</p>
          <p className="text-sm text-white/80 text-shadow-hero">You don&apos;t have admin access.</p>
        </div>
      </div>
    )
  }

  if (pageStatus === 'not-found') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white font-semibold text-shadow-hero">Devotion not found.</p>
          <p className="text-sm text-white/80 text-shadow-hero">It may have been deleted or the link is incorrect.</p>
          <Link
            href="/admin/devotions"
            className="inline-block text-sm text-blue-300 hover:underline text-shadow-hero"
          >
            ← Back to All Devotions
          </Link>
        </div>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────

  const inputClass =
    'w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30'
  const labelClass = 'block text-xs uppercase tracking-widest text-steel mb-2'

  return (
    <div className="space-y-8">
      {/* Confirmation modal */}
      {confirming && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-charcoal/40 px-4"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-steel/20 bg-white p-6 shadow-lg space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-base font-semibold text-charcoal">Save changes?</h2>
              <p className="text-sm text-muted mt-1">
                This will update the devotion for{' '}
                <span className="text-charcoal font-medium">
                  {MONTHS[month - 1]} {safeDay}
                </span>
                .
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={saveChanges}
                className="rounded-lg bg-steel px-4 py-2 text-white text-sm font-medium hover:bg-steel/90 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-sm text-muted hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb + heading */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin" className="text-sm text-blue-300 hover:underline text-shadow-hero">
            Admin
          </Link>
          <span className="text-sm text-white text-shadow-hero">/</span>
          <Link href="/admin/devotions" className="text-sm text-blue-300 hover:underline text-shadow-hero">
            All Devotions
          </Link>
          <span className="text-sm text-white text-shadow-hero">/</span>
          <span className="text-sm text-white text-shadow-hero">Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-white text-shadow-hero">Edit Devotion</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success banner */}
        {saved && (
          <div className="rounded-lg bg-steel/10 border border-steel/20 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-steel font-medium">Changes saved.</p>
            <Link
              href={`/devotion/${month}/${safeDay}`}
              className="text-sm text-steel underline underline-offset-2 hover:text-steel/70 transition-colors whitespace-nowrap"
            >
              View Devotion →
            </Link>
          </div>
        )}

        {/* Date */}
        <AnimatedCard delay={0}>
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-5">
          <p className={labelClass}>Date</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Month</label>
              <select
                value={month}
                onChange={(e) => handleMonthChange(Number(e.target.value))}
                className={inputClass}
              >
                {MONTHS.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Day</label>
              <select
                value={safeDay}
                onChange={(e) => setDay(Number(e.target.value))}
                className={inputClass}
              >
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        </AnimatedCard>

        {/* Content */}
        <AnimatedCard delay={0.08}>
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-5">
          <p className={labelClass}>Content</p>

          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="The devotion title"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Verse Reference</label>
            <input
              type="text"
              value={verseReference}
              onChange={(e) => setVerseReference(e.target.value)}
              required
              placeholder="e.g. John 3:16"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              Verse Text{' '}
              <span className="normal-case text-muted/70 tracking-normal font-normal">
                (optional)
              </span>
            </label>
            <textarea
              value={verseText}
              onChange={(e) => setVerseText(e.target.value)}
              rows={3}
              placeholder="The full verse text…"
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>

          <div>
            <label className={labelClass}>Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={12}
              placeholder="The devotion content…"
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>

          <div>
            <label className={labelClass}>
              Prayer{' '}
              <span className="normal-case text-muted/70 tracking-normal font-normal">
                (optional)
              </span>
            </label>
            <textarea
              value={prayer}
              onChange={(e) => setPrayer(e.target.value)}
              rows={4}
              placeholder="A closing prayer…"
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>
        </div>
        </AnimatedCard>

        {/* Settings */}
        <AnimatedCard delay={0.16}>
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-charcoal">Published</p>
              <p className="text-xs text-muted mt-0.5">Visible to all readers</p>
            </div>
            <button
              type="button"
              onClick={() => { setPublished((v) => !v); setSaved(false) }}
              aria-pressed={published}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-steel/30 ${
                published ? 'bg-steel' : 'bg-steel/20'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  published ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        </AnimatedCard>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4 pb-10">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-steel px-5 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <Link
            href="/admin/devotions"
            className="text-sm text-white text-shadow-hero hover:text-white/70 transition-colors"
          >
            ← All Devotions
          </Link>
        </div>
      </form>
    </div>
  )
}
