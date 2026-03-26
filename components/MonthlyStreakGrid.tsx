'use client'

import { useRouter } from 'next/navigation'
import { getTodayET } from '@/lib/getTodayET'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type Props = {
  currentMonth: number
  currentYear: number
  readDates: string[]
  variant?: 'light' | 'dark'
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function MonthlyStreakGrid({ currentMonth, currentYear, readDates, variant = 'light' }: Props) {
  const dark = variant === 'dark'
  const router = useRouter()
  const today = getTodayET()

  const readSet = new Set(readDates)
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay() // 0 = Sun
  const isCurrentMonth = today.month === currentMonth && today.year === currentYear

  // Leading empty cells + actual days
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  function dateStr(day: number) {
    return `${currentYear}-${pad(currentMonth)}-${pad(day)}`
  }

  return (
    <div className="space-y-1">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className={`text-center text-[10px] uppercase tracking-wide py-1 ${dark ? 'text-white/50' : 'text-muted'}`}
          >
            {label.slice(0, 1)}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`gap-${i}`} />

          const isRead = readSet.has(dateStr(day))
          const isToday = isCurrentMonth && today.day === day

          return (
            <button
              key={day}
              onClick={() => router.push(`/devotion/${currentMonth}/${day}`)}
              className={[
                'mx-auto flex aspect-square w-8 items-center justify-center rounded-full text-xs transition-colors',
                isRead
                  ? dark ? 'bg-white/25 font-medium text-white hover:bg-white/35' : 'bg-steel/20 font-medium text-steel hover:bg-steel/30'
                  : dark ? 'text-white/50 hover:bg-white/10' : 'text-muted/70 hover:bg-steel/5',
                isToday
                  ? dark ? 'ring-1 ring-white/60' : 'ring-1 ring-steel/50 ring-offset-1'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
