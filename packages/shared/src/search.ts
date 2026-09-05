import { LIMITS } from './constants'

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'on', 'at', 'with'])

/**
 * Builds the `searchTokens` array stored on searchable documents. We index whole
 * words plus 3..6 char prefixes so "typ" finds "typescript" with a plain
 * `array-contains-any` query — good enough for a campus-sized dataset, and it
 * keeps us off Algolia.
 */
export function tokenize(...fields: (string | string[] | null | undefined)[]): string[] {
  const out = new Set<string>()
  for (const field of fields) {
    const values = Array.isArray(field) ? field : [field]
    for (const value of values) {
      if (!value) continue
      for (const word of normalise(value).split(' ')) {
        if (word.length < 2 || STOP.has(word)) continue
        out.add(word)
        for (let n = 3; n < Math.min(word.length, 7); n++) out.add(word.slice(0, n))
      }
    }
  }
  return [...out].slice(0, 400)
}

/** Query side: the words a user typed, capped to Firestore's array-contains-any limit. */
export function queryTokens(q: string): string[] {
  return [...new Set(normalise(q).split(' ').filter((w) => w.length >= 2 && !STOP.has(w)))].slice(
    0,
    LIMITS.searchTokens,
  )
}

export const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
