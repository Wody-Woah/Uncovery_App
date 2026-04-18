'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { isAdmin } from '@/lib/isAdmin'
import AnimatedCard from '@/components/AnimatedCard'

type AuthorUpdate = {
  id: string
  title: string
  body: string
  published: boolean
  published_at: string | null
  created_at: string
}

export default function UpdateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [update, setUpdate] = useState<AuthorUpdate | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const adminUser = await isAdmin()

      const query = supabase
        .from('author_updates')
        .select('id, title, body, published, published_at, created_at')
        .eq('id', id)

      const { data, error } = await (adminUser ? query : query.eq('published', true)).single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setUpdate(data)
      }
      setLoading(false)
    }

    init()
  }, [id, router])

  if (loading) {
    return <div className="py-20 text-center text-white font-semibold text-sm text-shadow-hero">Loading…</div>
  }

  if (notFound || !update) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard" className="text-sm text-brand-blue hover:underline text-shadow-hero">
          ← Dashboard
        </Link>
        <AnimatedCard>
          <div className="rounded-2xl border border-steel/20 bg-white p-10 text-center shadow-sm">
            <p className="text-muted text-sm">Update not found.</p>
          </div>
        </AnimatedCard>
      </div>
    )
  }

  const dateStr = new Date(update.published_at ?? update.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="text-sm text-brand-blue hover:underline text-shadow-hero">
        ← Dashboard
      </Link>

      <AnimatedCard>
        <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-charcoal mb-1">{update.title}</h1>
            <p className="text-sm text-muted">{dateStr}</p>
          </div>
          <div className="font-serif text-charcoal leading-[1.85] whitespace-pre-wrap text-[1.0625rem]">
            {update.body}
          </div>
        </div>
      </AnimatedCard>
    </div>
  )
}
