/**
 * Timezone utilities for Thailand (Asia/Bangkok, UTC+7).
 * Ensures date and time formatting is consistent across serverless (Vercel UTC) and browser environments.
 */

const BANGKOK_TZ = 'Asia/Bangkok'

/**
 * Creates a Date object from a date string ('YYYY-MM-DD') and time string ('HH:mm' or 'HH:mm:ss')
 * interpreted strictly as Asia/Bangkok time (UTC+7).
 */
export function createBangkokDate(dateStr: string, timeStr: string): Date {
  const parts = timeStr.split(':')
  const h = parts[0].padStart(2, '0')
  const m = (parts[1] || '00').padStart(2, '0')
  const s = (parts[2] || '00').padStart(2, '0')
  return new Date(`${dateStr}T${h}:${m}:${s}+07:00`)
}

/**
 * Formats a Date or ISO string into 'HH:mm' in Asia/Bangkok timezone.
 */
export function formatBangkokTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: BANGKOK_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/**
 * Formats a Date or ISO string into 'dd/MM/yyyy' in Asia/Bangkok timezone.
 */
export function formatBangkokDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BANGKOK_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d)

  const day = parts.find((p) => p.type === 'day')?.value || ''
  const month = parts.find((p) => p.type === 'month')?.value || ''
  const year = parts.find((p) => p.type === 'year')?.value || ''

  return `${day}/${month}/${year}`
}

/**
 * Formats a Date or ISO string into 'dd/MM/yyyy HH:mm' in Asia/Bangkok timezone.
 */
export function formatBangkokDateTime(date: Date | string): string {
  return `${formatBangkokDate(date)} ${formatBangkokTime(date)}`
}

/**
 * Gets the hour (0-23) of a Date or ISO string in Asia/Bangkok timezone.
 */
export function getBangkokHour(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: BANGKOK_TZ,
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(d)
  return parseInt(formatted, 10)
}
