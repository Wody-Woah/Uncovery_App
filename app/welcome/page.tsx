'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, type Variants } from 'framer-motion'
import { supabase } from '@/lib/supabaseClient'

// ---------------------------------------------------------------------------
// Author message
// ---------------------------------------------------------------------------

const AUTHOR_MESSAGE = `If you are reading this, first let me say — I'm really glad you're here.

The Uncovery Devotional was not written from a mountaintop. It was written from the valley. From hospital rooms. From grief. From relapse and recovery. From losing my brother and sister to overdose. From wrestling with despair, shame, and the quiet question of whether my life truly mattered.

This devotional for my co author Brit Eaton and myself was born out of a simple realization: healing is not about becoming someone new. It's about uncovering who you have always been.

For years I believed addiction was the problem. What I have come to understand is that disconnection is the deeper wound. Disconnection from God. From others. From our own story. From hope.

The opposite of addiction is connection.

Today, as I write this, I along with my partner Dr Amanda Sharp opened Root Awakening Farm — a place where recovery, nature, wellness, and community meet. Every day I watch men and women begin again. I see soil turned over and seeds planted, and I'm reminded that nothing grows in isolation. Healing happens in relationship. Growth happens in the light.

This app is an extension of that same heartbeat.

It is not a program to fix you.
It is not a checklist to complete.
It is not a formula.

It is an invitation.

An invitation to slow down.
To notice.
To listen.
To remember that you are wanted.
That you are not alone.
That your story is not over.

Some days these readings may feel gentle.
Some days they may stir something deep.
That's okay.

You don't have to rush. You don't have to perform. You don't have to prove anything here.

Whether you are newly sober, decades into recovery, questioning your faith, rebuilding your life, or simply exhausted from carrying too much — this space is for you.

My prayer is that as you move through these devotionals, you begin to uncover hope again.
That you sense God not as distant, but near.
Not as disappointed, but present.
Not as waiting to condemn, but waiting to embrace.

To some, my story may sound tragic.
To others, it may sound like hope.

Either way, I am still here.

And if you are reading this, so are you.

Let's keep going.

With you,
George`

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
      delayChildren: 0.05,
    },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function WelcomePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // If user has already seen welcome, send them straight to the dashboard
      const { data: flags } = await supabase
        .from('user_flags')
        .select('has_seen_welcome')
        .eq('user_id', user.id)
        .single()

      if (flags?.has_seen_welcome) {
        router.push('/dashboard')
        return
      }

      setUserId(user.id)
      setReady(true)
    }

    init()
  }, [router])

  async function handleContinue() {
    if (!userId || saving) return
    setSaving(true)
    await supabase
      .from('user_flags')
      .upsert({ user_id: userId, has_seen_welcome: true }, { onConflict: 'user_id' })
    window.location.href = '/onboarding'
  }

  if (!ready) {
    return (
      <div className="space-y-5 py-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm space-y-3 animate-pulse">
            <div className="h-4 w-1/2 rounded bg-steel/10" />
            <div className="h-3 w-full rounded bg-steel/10" />
            <div className="h-3 w-4/5 rounded bg-steel/10" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <motion.div
      className="space-y-5 py-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Headline */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm text-center"
      >
        <p className="text-xs uppercase tracking-widest text-steel mb-2">
          A Message from the Author
        </p>
        <h1 className="text-2xl font-semibold text-charcoal">Welcome to The Uncovery</h1>
        <p className="text-sm text-muted mt-2">You belong here. Take your time.</p>
      </motion.div>

      {/* Author message */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-steel/15 bg-white shadow-sm overflow-hidden"
      >
        {/* Letter header */}
        <div className="px-6 pt-6 pb-4 border-b border-steel/10">
          <p className="text-[10px] uppercase tracking-[0.18em] text-steel/70">A Personal Note</p>
          <p className="font-display text-2xl font-semibold text-charcoal mt-1">From George</p>
        </div>

        {/* Letter body */}
        <div className="px-6 py-6 space-y-5">
          {AUTHOR_MESSAGE.split('\n\n').map((para, i, arr) => {
            const lines = para.split('\n')
            const isSignature = i === arr.length - 1
            if (isSignature) {
              return (
                <div key={i} className="pt-1 space-y-0.5">
                  <p className="font-display italic text-[15px] text-charcoal/70">{lines[0]}</p>
                  <p className="font-display text-2xl font-semibold text-charcoal">{lines[1]}</p>
                </div>
              )
            }
            return (
              <p key={i} className="font-display text-[15.5px] text-charcoal leading-[1.9]">
                {lines.map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < lines.length - 1 && <br />}
                  </span>
                ))}
              </p>
            )
          })}
        </div>
      </motion.div>

      {/* Book cover */}
      <motion.div
        variants={itemVariants}
        className="rounded-2xl border border-steel/15 bg-white p-6 shadow-sm flex flex-col items-center gap-4"
      >
        <p className="text-xs uppercase tracking-widest text-steel">The Uncovery Devotional</p>
        <div className="w-full max-w-xs mx-auto">
          <Image
            src="/book.jpg"
            alt="The Uncovery Devotional book cover"
            width={970}
            height={600}
            priority
            sizes="(max-width: 768px) 90vw, 320px"
            className="w-full h-auto rounded-xl shadow-md"
          />
        </div>
      </motion.div>

      {/* Buttons */}
      <motion.div variants={itemVariants} className="space-y-3 pb-4">
        <button
          onClick={handleContinue}
          disabled={saving}
          className="block w-full rounded-xl bg-steel px-4 py-3 text-center text-sm font-medium text-white hover:bg-steel/90 transition-colors disabled:opacity-60"
        >
          {saving ? 'One moment…' : 'Continue to the Home Page'}
        </button>
        <a
          href="https://a.co/d/078elRSp"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl border border-steel/30 bg-white px-4 py-3 text-center text-sm font-medium text-steel hover:bg-canvas transition-colors"
        >
          Buy the Book on Amazon
        </a>
      </motion.div>
    </motion.div>
  )
}
