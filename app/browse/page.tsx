'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Use a leap year so February shows 29 days as an option
function daysInMonth(month: number) {
  return new Date(2024, month, 0).getDate()
}

export default function BrowsePage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
    })
  }, [router])

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [day, setDay] = useState(now.getDate())

  const maxDay = daysInMonth(month)
  const safeDay = day > maxDay ? maxDay : day

  function handleMonthChange(val: number) {
    setMonth(val)
    const max = daysInMonth(val)
    if (day > max) setDay(max)
  }

  function handleGo() {
    router.push(`/devotion/${month}/${safeDay}`)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-blue text-shadow-hero">Browse Devotions</h1>
        <p className="text-sm text-white/80 text-shadow-hero mt-1">
          Select a month and day to read a devotion.
        </p>
      </div>

      <div className="rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-5">
        {/* Month selector */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-steel mb-2">
            Month
          </label>
          <select
            value={month}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal focus:outline-none focus:ring-2 focus:ring-steel/30"
          >
            {MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Day selector */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-steel mb-2">
            Day
          </label>
          <select
            value={safeDay}
            onChange={(e) => setDay(Number(e.target.value))}
            className="w-full rounded-lg border border-steel/20 bg-canvas px-3 py-2.5 text-charcoal focus:outline-none focus:ring-2 focus:ring-steel/30"
          >
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleGo}
          className="w-full rounded-lg bg-steel px-4 py-2.5 text-white text-sm font-medium hover:bg-steel/90 transition-colors"
        >
          Read Devotion
        </button>
      </div>
    </div>
  )
}
