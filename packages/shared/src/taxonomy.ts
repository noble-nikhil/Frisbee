// Controlled vocabulary for profile tags. Users pick from these lists (typeahead),
// never free text, so matching works on exact ids. Ids are stable; labels can change.

export type TagKind = 'skill' | 'interest' | 'hobby' | 'careerGoal'

export interface TagDef {
  id: string
  label: string
  group: string
}

const define = (group: string, labels: string[]): TagDef[] =>
  labels.map((label) => ({ id: toTagId(label), label, group }))

export const toTagId = (label: string) =>
  label
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const SKILLS: TagDef[] = [
  ...define('Programming', [
    'Python',
    'JavaScript',
    'TypeScript',
    'Java',
    'C',
    'C++',
    'Go',
    'Rust',
    'Kotlin',
    'Swift',
    'SQL',
  ]),
  ...define('Web & mobile', [
    'React',
    'Node.js',
    'Next.js',
    'Flutter',
    'React Native',
    'Android',
    'iOS',
    'Firebase',
    'Tailwind CSS',
  ]),
  ...define('Data & AI', [
    'Machine learning',
    'Deep learning',
    'Data analysis',
    'Computer vision',
    'NLP',
    'Statistics',
    'Power BI',
    'Excel',
  ]),
  ...define('Systems & cloud', ['Linux', 'Docker', 'AWS', 'Git', 'Networking', 'Cybersecurity']),
  ...define('Hardware', ['Arduino', 'Raspberry Pi', 'Embedded C', 'PCB design', 'IoT', 'Robotics', 'VLSI']),
  ...define('Design', ['Figma', 'UI/UX design', 'Graphic design', 'Video editing', 'Photography', '3D modelling']),
  ...define('Business & communication', [
    'Public speaking',
    'Content writing',
    'Marketing',
    'Finance',
    'Product management',
    'Pitching',
  ]),
  ...define('Languages', ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'German', 'Japanese', 'French']),
  ...define('Academics', ['Calculus', 'Linear algebra', 'Physics', 'Chemistry', 'Economics', 'Accounting']),
]

export const INTERESTS: TagDef[] = [
  ...define('Tech', ['Open source', 'Hackathons', 'Startups', 'AI', 'Blockchain', 'Game development', 'Competitive programming']),
  ...define('Creative', ['Music', 'Film', 'Theatre', 'Writing', 'Art', 'Dance', 'Stand-up comedy']),
  ...define('Active', ['Football', 'Cricket', 'Basketball', 'Badminton', 'Volleyball', 'Running', 'Gym', 'Yoga', 'Trekking']),
  ...define('Mind', ['Chess', 'Quizzing', 'Debating', 'Philosophy', 'Psychology', 'Astronomy']),
  ...define('Social', ['Volunteering', 'Environment', 'Politics', 'Travel', 'Food', 'Anime']),
]

export const HOBBIES: TagDef[] = define('Hobbies', [
  'Reading',
  'Cooking',
  'Gaming',
  'Photography',
  'Sketching',
  'Guitar',
  'Singing',
  'Cycling',
  'Board games',
  'Podcasts',
  'Gardening',
  'Journaling',
  'Baking',
  'Bird watching',
])

export const CAREER_GOALS: TagDef[] = define('Career goals', [
  'Software engineer',
  'Data scientist',
  'ML researcher',
  'Product manager',
  'Founder',
  'Designer',
  'Consultant',
  'Civil services',
  'Higher studies abroad',
  'Core engineering',
  'Finance / analyst',
  'Research / PhD',
  'Creator / media',
  'Lawyer',
])

export const TAXONOMY: Record<TagKind, TagDef[]> = {
  skill: SKILLS,
  interest: INTERESTS,
  hobby: HOBBIES,
  careerGoal: CAREER_GOALS,
}

const labelIndex = new Map<string, string>()
for (const list of Object.values(TAXONOMY)) for (const t of list) labelIndex.set(t.id, t.label)

/** Human label for a tag id; falls back to the id so unknown ids still render. */
export const tagLabel = (id: string) => labelIndex.get(id) ?? id

export const isKnownTag = (kind: TagKind, id: string) => TAXONOMY[kind].some((t) => t.id === id)
