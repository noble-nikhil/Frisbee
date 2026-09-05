import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from 'date-fns'
import type { Timestamp } from '@frisbee/shared'

// tailwind-merge must know our @theme tokens, otherwise `text-small` is mistaken
// for a colour and dropped whenever a `text-ink-*` class follows it.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'body', 'small', 'micro'] }],
      shadow: [{ shadow: ['card', 'pop'] }],
    },
    theme: {
      spacing: ['topbar', 'tabs', 'sidebar', 'content', 'wide'],
    },
  },
})

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const toDate = (t: Timestamp | Date | null | undefined): Date | null =>
  !t ? null : t instanceof Date ? t : t.toDate()

/** "Today, 5:30 pm" · "Tomorrow, 9 am" · "Sat 12 Oct, 7 pm" */
export function when(t: Timestamp | Date | null | undefined): string {
  const d = toDate(t)
  if (!d) return ''
  const time = format(d, d.getMinutes() ? 'h:mm a' : 'h a').toLowerCase()
  if (isToday(d)) return `Today, ${time}`
  if (isTomorrow(d)) return `Tomorrow, ${time}`
  return `${format(d, 'EEE d MMM')}, ${time}`
}

export function timeAgo(t: Timestamp | Date | null | undefined): string {
  const d = toDate(t)
  if (!d) return ''
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return 'now'
  if (isToday(d)) return format(d, 'h:mm a').toLowerCase()
  if (isYesterday(d)) return 'yesterday'
  if (diff < 7 * 86_400_000) return formatDistanceToNowStrict(d, { addSuffix: false })
  return format(d, 'd MMM')
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

/** Sorted pair id for symmetric relations (connections, dm threads). */
export const pairId = (a: string, b: string) => (a < b ? `${a}_${b}` : `${b}_${a}`)

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const yearLabel = (year: number | null) =>
  year ? ['', '1st year', '2nd year', '3rd year', '4th year', '5th year'][year] : ''

export const emailDomain = (email: string) => email.split('@')[1]?.toLowerCase() ?? ''

/** Turns Firebase/Firestore error codes into something a person can read. */
export function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  const table: Record<string, string> = {
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/invalid-login-credentials': 'Wrong email or password.',
    'auth/user-not-found': 'No account with that email.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Use at least 8 characters.',
    'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase yet.',
    // Both mean the site's domain is missing from Firebase → Authentication → Settings → Authorized domains
    'auth/unauthorized-domain': "This site's domain is not authorized in Firebase yet.",
    'auth/unauthorized-continue-uri': "This site's domain is not authorized in Firebase yet.",
    'permission-denied': "You don't have permission to do that.",
    unavailable: "You're offline. We'll retry when you're back.",
    'failed-precondition': 'That action is no longer possible.',
  }
  if (table[code]) return table[code]
  const message = (err as Error)?.message
  return message && message.length < 120 ? message : 'Something went wrong. Please try again.'
}
