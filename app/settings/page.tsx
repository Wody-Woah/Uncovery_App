'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function SettingsPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [showJourneyCard, setShowJourneyCard] = useState(true)
  const [showCleanDateCard, setShowCleanDateCard] = useState(false)
  const [hasCleanDate, setHasCleanDate] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('profiles')
        .select('show_journey_card, show_clean_date_card, clean_date')
        .eq('id', user.id)
        .single()

      if (data) {
        setShowJourneyCard(data.show_journey_card ?? true)
        setShowCleanDateCard(data.show_clean_date_card ?? false)
        setHasCleanDate(!!data.clean_date)
      }
      setLoading(false)
    }
    init()
  }, [router])

  async function saveField(field: string, value: boolean) {
    if (!userId) return
    await supabase
      .from('profiles')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', userId)
  }

  if (loading) {
    return <div className="py-20 text-center text-white text-sm text-shadow-hero">Loading…</div>
  }

  const toggleClass = (on: boolean, disabled = false) =>
    `relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${on ? 'bg-steel' : 'bg-steel/20'}`

  const knobClass = (on: boolean) =>
    `inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-brand-blue text-shadow-hero">Settings</h1>

      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm">
        <h2 className="text-xs uppercase tracking-widest text-steel mb-1">Dashboard Cards</h2>
        <p className="text-sm text-muted mb-5">Choose which cards appear on your home screen.</p>

        <div className="space-y-1">

          {/* Your Journey */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-charcoal">Your Journey</p>
              <p className="text-xs text-muted mt-0.5">Streak, days read, and monthly grid.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const next = !showJourneyCard
                setShowJourneyCard(next)
                await saveField('show_journey_card', next)
              }}
              className={toggleClass(showJourneyCard)}
            >
              <span className={knobClass(showJourneyCard)} />
            </button>
          </div>

          <div className="border-t border-steel/10" />

          {/* Days Clean */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-charcoal">Days Clean</p>
              <p className="text-xs text-muted mt-0.5">
                {hasCleanDate
                  ? 'Your days clean counter.'
                  : <>Set your clean date in <Link href="/profile" className="text-steel hover:underline">Profile</Link> first.</>}
              </p>
            </div>
            <button
              type="button"
              disabled={!hasCleanDate}
              onClick={async () => {
                if (!hasCleanDate) return
                const next = !showCleanDateCard
                setShowCleanDateCard(next)
                await saveField('show_clean_date_card', next)
              }}
              className={toggleClass(showCleanDateCard, !hasCleanDate)}
            >
              <span className={knobClass(showCleanDateCard)} />
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
