'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'
import AnimatedCard from '@/components/AnimatedCard'

type PageStatus = 'loading' | 'unauthorized' | 'not-found' | 'ready'

export default function EditUpdatePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [pageStatus, setPageStatus] = useState<PageStatus>('loading')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [published, setPublished] = useState(false)
  const [originalPublished, setOriginalPublished] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [pinned, setPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const admin = await isAdmin()
      if (!admin) { setPageStatus('unauthorized'); return }

      const { data, error: fetchError } = await supabase
        .from('author_updates')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !data) { setPageStatus('not-found'); return }

      setTitle(data.title)
      setBody(data.body)
      setPublished(data.published)
      setOriginalPublished(data.published)
      setPublishedAt(data.published_at)
      setPinned(data.pinned)
      setPageStatus('ready')
    }

    init()
  }, [id])

  function handlePublishedToggle() {
    const next = !published
    setPublished(next)
    setSaved(false)
    // Record publish time when turning on for the first time
    if (next && !originalPublished) {
      setPublishedAt(new Date().toISOString())
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)
    setSubmitting(true)

    const { error: updateError } = await supabase
      .from('author_updates')
      .update({
        title: title.trim(),
        body: body.trim(),
        published,
        pinned,
        published_at: published ? (publishedAt ?? new Date().toISOString()) : null,
      })
      .eq('id', id)

    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSaved(true)
    setOriginalPublished(published)
  }

  if (pageStatus === 'loading') {
    return (
      <div className="space-y-8">
        <div className="h-7 w-36 rounded bg-white/20 animate-pulse" />
        <div className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-5 animate-pulse">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 rounded bg-steel/10" />
              <div className={`w-full rounded-lg bg-steel/10 ${i === 1 ? 'h-32' : 'h-10'}`} />
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
          <p className="text-white font-semibold text-shadow-hero">Update not found.</p>
          <Link href="/admin/updates" className="inline-block text-sm text-blue-300 hover:underline text-shadow-hero">
            ← Back to Updates
          </Link>
        </div>
      </div>
    )
  }

  const inputClass = 'w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-steel/30'
  const labelClass = 'block text-xs uppercase tracking-widest text-steel mb-2'

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/admin" className="text-sm text-blue-300 hover:underline text-shadow-hero">Admin</Link>
          <span className="text-sm text-white text-shadow-hero">/</span>
          <Link href="/admin/updates" className="text-sm text-blue-300 hover:underline text-shadow-hero">From the Author</Link>
          <span className="text-sm text-white text-shadow-hero">/</span>
          <span className="text-sm text-white text-shadow-hero">Edit</span>
        </div>
        <h1 className="text-2xl font-semibold text-white text-shadow-hero">Edit Update</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {saved && (
          <div className="rounded-lg bg-steel/10 border border-steel/20 px-4 py-3 text-sm text-steel font-medium">
            Changes saved.
          </div>
        )}

        <AnimatedCard delay={0}>
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-5">
          <div>
            <label className={labelClass}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setSaved(false) }}
              required
              placeholder="Update title"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Body</label>
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setSaved(false) }}
              required
              rows={12}
              placeholder="Write your message…"
              className={`${inputClass} resize-none leading-relaxed`}
            />
          </div>
        </div>
        </AnimatedCard>

        <AnimatedCard delay={0.08}>
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-charcoal">Published</p>
              <p className="text-xs text-muted mt-0.5">Visible to all readers</p>
            </div>
            <button
              type="button"
              onClick={handlePublishedToggle}
              aria-pressed={published}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-steel/30 ${published ? 'bg-steel' : 'bg-steel/20'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${published ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-steel/10 pt-4">
            <div>
              <p className="text-sm font-medium text-charcoal">Pinned</p>
              <p className="text-xs text-muted mt-0.5">Show at the top of the list</p>
            </div>
            <button
              type="button"
              onClick={() => { setPinned((v) => !v); setSaved(false) }}
              aria-pressed={pinned}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-steel/30 ${pinned ? 'bg-steel' : 'bg-steel/20'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${pinned ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
        </AnimatedCard>

        <div className="flex flex-wrap items-center gap-4 pb-10">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-steel px-5 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save Changes'}
          </button>
          <Link
            href="/admin/updates"
            className="text-sm text-white text-shadow-hero hover:text-white/70 transition-colors"
          >
            ← All Updates
          </Link>
        </div>
      </form>
    </div>
  )
}
