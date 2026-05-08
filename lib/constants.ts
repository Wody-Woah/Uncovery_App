export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Uses 2024 (leap year) so February correctly returns 29 days
export function daysInMonth(month: number) {
  return new Date(2024, month, 0).getDate()
}

export const CONTACT_EMAIL = 'george@rootawakeningfarm.org'

export const EMOJIS = ['🙏', '❤️', '👍', '🕊️', '✝️', '💙', '🔥', '🫶', '🙌', '💪', '😊', '😢', '🌿']
