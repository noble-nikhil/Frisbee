import { describe, expect, it } from 'vitest'
import { explainMatch, rankMatches, scoreMatch, skillSwap } from '../matching'
import type { Availability, Department, Year } from '..'

const base = {
  skills: [] as { tag: string; level: 1 | 2 | 3 }[],
  interests: [] as string[],
  hobbies: [] as string[],
  careerGoals: [] as string[],
  department: null as Department | null,
  year: null as Year | null,
  availability: {} as Availability,
  canTeach: [] as string[],
  wantsToLearn: [] as string[],
}

const me = {
  ...base,
  uid: 'me',
  skills: [
    { tag: 'react', level: 2 as const },
    { tag: 'python', level: 3 as const },
  ],
  interests: ['football', 'hackathons'],
  careerGoals: ['founder'],
  department: 'Computer Science' as const,
  year: 2 as const,
  availability: { mon: ['evening' as const], sat: ['morning' as const, 'evening' as const] },
  canTeach: ['python'],
  wantsToLearn: ['figma'],
}

describe('scoreMatch', () => {
  it('gives 100 to an identical profile', () => {
    expect(scoreMatch(me, { ...me, uid: 'twin' }).score).toBe(100)
  })

  it('gives 0 when nothing is shared', () => {
    const stranger = { ...base, uid: 's', skills: [{ tag: 'law', level: 1 as const }] }
    expect(scoreMatch(me, stranger).score).toBe(0)
  })

  it('weights skills above hobbies', () => {
    const skillTwin = { ...base, uid: 'a', skills: [{ tag: 'react', level: 1 as const }] }
    const hobbyTwin = { ...base, uid: 'b', hobbies: ['reading'] }
    const withHobby = { ...me, hobbies: ['reading'] }
    expect(scoreMatch(withHobby, skillTwin).score).toBeGreaterThan(scoreMatch(withHobby, hobbyTwin).score)
  })
})

describe('rankMatches', () => {
  it('sorts by score, drops self and zero scores', () => {
    const others = [
      { ...base, uid: 'me' },
      { ...base, uid: 'zero' },
      { ...base, uid: 'low', hobbies: [], interests: ['football'] },
      { ...base, uid: 'high', skills: [{ tag: 'react', level: 1 as const }], interests: ['football'] },
    ]
    expect(rankMatches(me, others).map((m) => m.uid)).toEqual(['high', 'low'])
  })
})

describe('explainMatch', () => {
  it('groups shared tags with the strongest reason first', () => {
    const { shared } = scoreMatch(me, { ...me, uid: 'x' })
    const groups = explainMatch(shared)
    expect(groups[0]).toEqual({ label: 'Skills', tags: ['react', 'python'] })
    expect(groups.at(-1)?.label).toBe('Also')
  })
})

describe('skillSwap', () => {
  it('is reciprocal', () => {
    const designer = { ...base, uid: 'd', canTeach: ['figma'], wantsToLearn: ['python'] }
    expect(skillSwap(me, designer)).toEqual({ iTeach: ['python'], theyTeach: ['figma'] })
    expect(skillSwap(me, { ...designer, wantsToLearn: ['java'] })).toBeNull()
  })
})
