import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  const payload = JSON.stringify({
    title: 'Uncovery Devotional',
    body: "Today's devotion is ready. Take a moment to read and reflect.",
    url: '/today',
  })

  const staleIds: string[] = []
  let sent = 0

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err: unknown) {
        // 404 / 410 means the subscription is expired — clean it up
        if (err && typeof err === 'object' && 'statusCode' in err) {
          const status = (err as { statusCode: number }).statusCode
          if (status === 404 || status === 410) staleIds.push(sub.id)
        }
      }
    })
  )

  if (staleIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }

  return NextResponse.json({ sent, removed: staleIds.length })
}
