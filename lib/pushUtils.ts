export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return new Uint8Array(Array.from(rawData, (char) => char.charCodeAt(0)))
}

function offsetHours() {
  return Math.round(new Date().getTimezoneOffset() / 60)
}

export function localToUtc(localHour: number) {
  return (localHour + offsetHours() + 24) % 24
}

export function utcToLocal(utcHour: number) {
  return (utcHour - offsetHours() + 24) % 24
}

export function formatHour(h: number) {
  const d = new Date()
  d.setHours(h, 0, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export const REMINDER_LOCAL_HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6 AM – 9 PM
