'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Devotion = {
  id: string
  title: string
  verse_reference: string
  verse_text: string | null
  body: string
  prayer: string
  month: number
  day: number
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function DevotionPage() {
  const params = useParams()
  const router = useRouter()
  const month = Number(params.month)
  const day = Number(params.day)

  const [devotion, setDevotion] = useState<Devotion | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
  }, [router])

  useEffect(() => {
    if (isNaN(month) || isNaN(day)) {
      setNotFound(true)
      setLoading(false)
      return
    }

    async function fetchDevotion() {
      const { data, error } = await supabase
        .from('devotions')
        .select('*')
        .eq('month', month)
        .eq('day', day)
        .eq('published', true)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setDevotion(data)
      }
      setLoading(false)
    }

    fetchDevotion()
  }, [month, day])

  if (loading) {
    return <div className="py-20 text-center text-muted text-sm">Loading…</div>
  }

  const monthName = MONTH_NAMES[month] ?? ''

  if (notFound || !devotion) {
    return (
      <div className="space-y-6">
        <Link href="/browse" className="text-sm text-steel hover:underline">
          ← Back to Browse
        </Link>
        <div className="rounded-2xl border border-steel/20 bg-white p-10 text-center shadow-sm">
          <p className="text-muted text-sm">
            No devotion found for {monthName} {day}.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/browse" className="text-steel hover:underline">
          ← Browse
        </Link>
        <span className="text-muted">/</span>
        <span className="text-muted">
          {monthName} {day}
        </span>
      </div>

      {/* Devotion Card */}
      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-charcoal mb-1">{devotion.title}</h1>
          <p className="text-sm text-muted">{devotion.verse_reference}</p>
        </div>

        {/* Verse */}
        {devotion.verse_text && (
          <div className="border-l-2 border-steel/40 pl-4 py-1">
            <p className="font-serif italic text-charcoal/80 text-base leading-relaxed">
              {devotion.verse_text}
            </p>
          </div>
        )}

        {/* Body */}
        <div className="font-serif text-charcoal leading-[1.85] whitespace-pre-wrap text-[1.0625rem]">
          {devotion.body}
        </div>

        {/* Prayer */}
        {devotion.prayer && (
          <div className="rounded-xl bg-canvas border border-steel/10 p-5">
            <p className="text-xs uppercase tracking-widest text-steel mb-3">Prayer</p>
            <p className="font-serif italic text-charcoal/90 leading-[1.85]">
              {devotion.prayer}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
