import { describe, expect, it } from 'vitest'
import { queryTokens, tokenize } from '../search'

describe('tokenize', () => {
  it('indexes words and prefixes, skipping stop words', () => {
    const tokens = tokenize('Intro to TypeScript', ['react'])
    expect(tokens).toContain('typescript')
    expect(tokens).toContain('typ')
    expect(tokens).toContain('react')
    expect(tokens).not.toContain('to')
  })
})

describe('queryTokens', () => {
  it('caps at 10 and dedupes', () => {
    const q = Array.from({ length: 15 }, (_, i) => `word${i} word${i}`).join(' ')
    expect(queryTokens(q)).toHaveLength(10)
  })
})
