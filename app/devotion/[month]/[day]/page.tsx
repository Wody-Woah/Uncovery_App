'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import DevotionCard from '@/components/DevotionCard'

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
  const [userId, setUserId] = useState<string | null>(null)
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase
        .from('bookmarks')
        .select('month')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('day', day)
        .maybeSingle()
      if (data) setBookmarked(true)
    })
  }, [router, month, day])

  async function handleBookmarkToggle() {
    if (!userId || bookmarking) return
    setBookmarking(true)
    if (bookmarked) {
      await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('month', month)
        .eq('day', day)
      setBookmarked(false)
    } else {
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: userId, month, day })
      if (!error || error.code === '23505') setBookmarked(true)
    }
    setBookmarking(false)
  }

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
    return <div className="py-20 text-center text-white font-semibold text-sm text-shadow-hero">Loading…</div>
  }

  const monthName = MONTH_NAMES[month] ?? ''

  if (notFound || !devotion) {
    return (
      <div className="space-y-6">
        <Link href="/browse" className="text-sm text-brand-blue hover:underline text-shadow-hero">
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
        <Link href="/browse" className="text-brand-blue hover:underline text-shadow-hero">
          ← Browse
        </Link>
        <span className="text-white text-shadow-hero">/</span>
        <span className="text-white text-shadow-hero">
          {monthName} {day}
        </span>
      </div>

      {/* Devotion Card */}
      <DevotionCard
        devotion={devotion}
        userId={userId}
        bookmarked={bookmarked}
        bookmarking={bookmarking}
        onBookmarkToggle={handleBookmarkToggle}
      />
    </div>
  )
}
