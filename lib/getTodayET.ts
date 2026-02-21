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
