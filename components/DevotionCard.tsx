'use client'

import { useEffect, useRef } from 'react'
import DevotionNotes from '@/components/DevotionNotes'

type Devotion = {
  title: string
  verse_reference: string
  verse_text: string | null
  body: string
  prayer: string
  month: number
  day: number
}

type Props = {
  devotion: Devotion
  userId: string | null
  bookmarked: boolean
  bookmarking: boolean
  onBookmarkToggle: () => void
  // Only passed by the Today page
  marked?: boolean
  marking?: boolean
  onMarkRead?: () => void
  hadStreak?: boolean
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  )
}

export default function DevotionCard({
  devotion,
  userId,
  bookmarked,
  bookmarking,
  onBookmarkToggle,
  marked,
  onMarkRead,
  hadStreak,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onMarkRead || marked) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onMarkRead()
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marked])

  return (
    <div className="relative rounded-2xl border border-steel/20 bg-white p-6 shadow-sm space-y-6">

      {/* Bookmark toggle — absolute top-right */}
      <button
        onClick={onBookmarkToggle}
        disabled={bookmarking}
        aria-label={bookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
        className={`absolute top-5 right-5 transition-colors disabled:opacity-50 disabled:cursor-default ${
          bookmarked ? 'text-steel' : 'text-muted hover:text-steel'
        }`}
      >
        <BookmarkIcon filled={bookmarked} />
      </button>

      {/* Header — pr-10 keeps title clear of the bookmark icon */}
      <div className="pr-10">
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

      {/* Sentinel — triggers auto mark-as-read when scrolled into view */}
      {onMarkRead && (
        <div ref={sentinelRef} className="flex items-center justify-center gap-2 py-1">
          {marked ? (
            <p className="text-xs text-steel/70">
              {hadStreak
                ? "Today's reading complete — your streak continues ✓"
                : "Today's reading complete — your streak begins ✓"}
            </p>
          ) : (
            <p className="text-xs text-muted/50">Read to the end to count today toward your streak.</p>
          )}
        </div>
      )}

      {/* Notes — contains the full-width "+ Add Note" button */}
      {userId && (
        <DevotionNotes userId={userId} month={devotion.month} day={devotion.day} />
      )}
    </div>
  )
}
