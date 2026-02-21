export function getTodayET(): { month: number; day: number; year: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date())

  return {
    month: Number(parts.find((p) => p.type === 'month')!.value),
    day:   Number(parts.find((p) => p.type === 'day')!.value),
    year:  Number(parts.find((p) => p.type === 'year')!.value),
  }
}

/** Returns today's date in ET as a YYYY-MM-DD string for database inserts. */
export function getETDateString(): string {
  const { year, month, day } = getTodayET()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)}`
}
