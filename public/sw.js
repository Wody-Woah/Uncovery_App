self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Uncovery Devotional', {
      body: data.body ?? "Today's devotion is ready. Take a moment to read and reflect.",
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/today' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? '/today'))
})
