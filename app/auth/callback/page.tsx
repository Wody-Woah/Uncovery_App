'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code')

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && data.user) {
          const displayName =
            data.user.user_metadata?.full_name ||
            data.user.email?.split('@')[0] ||
            'User'
          await supabase
            .from('profiles')
            .upsert({ id: data.user.id, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true })
          router.push('/dashboard')
          return
        }
      }

      router.push('/login')
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <div className="py-20 text-center text-white text-sm text-shadow-hero">
      Signing you in…
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center text-white text-sm text-shadow-hero">
        Signing you in…
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  )
}
