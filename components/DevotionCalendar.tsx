'use client'

import { useRef, useState } from 'react'
import { MONTHS, daysInMonth } from '@/lib/constants'

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function firstWeekday(month: number, year: number) {
  return new Date(year, month - 1, 1).getDay()
}

type Props = {
  initialMonth: number
  initialDay: number
  onSelect: (month: number, day: number) => void
}

export default function DevotionCalendar({ initialMonth, initialDay, onSelect }: Props) {
  const currentYear = new Date().getFullYear()
  const [viewMonth, setViewMonth] = useState(initialMonth)
  const [viewYear, setViewYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [selectedDay, setSelectedDay] = useState(initialDay)
  const touchStartX = useRef<number | null>(null)

  const today = new Date()
  const todayMonth = today.getMonth() + 1
  const todayDay = today.getDate()
  const todayYear = today.getFullYear()

  const totalDays = daysInMonth(viewMonth)
  const startOffset = firstWeekday(viewMonth, viewYear)

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(v => v - 1)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(v => v + 1)
  }

  function handleDayClick(day: number) {
    setSelectedMonth(viewMonth)
    setSelectedDay(day)
    onSelect(viewMonth, day)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) diff > 0 ? nextMonth() : prevMonth()
    touchStartX.current = null
  }

  // Build grid cells: null = empty, number = day
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div
      className="select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-steel/10 transition-colors text-steel"
          aria-label="Previous month"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <span className="text-sm font-semibold text-charcoal">{MONTHS[viewMonth - 1]} {viewYear}</span>

        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-steel/10 transition-colors text-steel"
          aria-label="Next month"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map(h => (
          <div key={h} className="text-center text-[10px] uppercase tracking-wider text-muted py-1">
            {h}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />

          const isSelected = day === selectedDay && viewMonth === selectedMonth
          const isToday = day === todayDay && viewMonth === todayMonth && viewYear === todayYear

          return (
            <button
              key={i}
              onClick={() => handleDayClick(day)}
              className={[
                'mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors',
                isSelected
                  ? 'bg-steel text-white font-semibold'
                  : isToday
                  ? 'border border-steel text-steel font-semibold hover:bg-steel/10'
                  : 'text-charcoal hover:bg-steel/10',
              ].join(' ')}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
