'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'
import AnimatedCard from '@/components/AnimatedCard'

type Status = 'loading' | 'unauthorized' | 'ready'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function daysInMonth(month: number) {
  return new Date(2024, month, 0).getDate()
}

export default function NewDevotionPage() {
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')

  const [month, setMonth] = useState(1)
  const [day, setDay] = useState(1)
  const [title, setTitle] = useState('')
  const [verseReference, setVerseReference] = useState('')
  const [verseText, setVerseText] = useState('')
  const [body, setBody] = useState('')
  const [prayer, setPrayer] = useState('')
  const [published, setPublished] = useState(true)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const admin = await isAdmin()
      setStatus(admin ? 'ready' : 'unauthorized')
    }
    checkAccess()
  }, [router])

  const maxDay = daysInMonth(month)
  const safeDay = day > maxDay ? maxDay : day

  function handleMonthChange(val: number) {
    setMonth(val)
    if (day > daysInMonth(val)) setDay(daysInMonth(val))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error: insertError } = await supabase.from('devotions').insert({
      month,
      day: safeDay,
      title: title.trim(),
      verse_reference: verseReference.trim(),
      verse_text: verseText.trim() || null,
      body: body.trim(),
      prayer: prayer.trim() || null,
      published,
    })

    if (insertError) {
      setSubmitting(false)
      if (insertError.code === '23505' || insertError.message.toLowerCase().includes('unique')) {
        setError(
          `A devotion for ${MONTHS[month - 1]} ${safeDay} already exists. Choose a different date or edit the existing one.`
        )
      } else {
        setError(insertError.message)
      }
      return
    }

    router.push(`/devotion/${month}/${safeDay}`)
  }

  if (status === 'loading') {
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

  if (status === 'unauthorized') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-white font-semibold text-shadow-hero">Not authorized.</p>
          <p className="text-sm text-white/80 text-shadow-hero">You don&apos;t have admin access.</p>
        </div>
      </div>
    )
  }

  const inputClass =
    'w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30'
  const labelClass = 'block text-xs uppercase tracking-widest text-steel mb-2'

  return (
    <div className="space-y-8">
      {/* Breadcrumb + heading */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin" className="text-sm text-blue-300 hover:underline text-shadow-hero">
            Admin
          </Link>
          <span className="text-white text-sm text-shadow-hero">/</span>
          <span className="text-sm text-white text-shadow-hero">New Devotion</span>
        </div>
        <h1 className="text-2xl font-semibold text-white text-shadow-hero">Create Devotion</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
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
              <p className="text-xs text-muted mt-0.5">Visible to all readers immediately</p>
            </div>
            <button
              type="button"
              onClick={() => setPublished((v) => !v)}
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
        <div className="flex items-center gap-4 pb-10">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-steel px-5 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Create Devotion'}
          </button>
          <Link
            href="/admin"
            className="text-sm text-white text-shadow-hero hover:text-white/70 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
