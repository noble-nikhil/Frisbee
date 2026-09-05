import { Link } from 'react-router'
import { Share, Smartphone, SquarePlus } from 'lucide-react'
import { Button } from '@/components/ui'
import { Credit } from '@/components/layout/credit'
import { Wordmark } from '@/components/layout/wordmark'
import { MODULES } from '@/components/layout/nav'

const BLURBS: Record<string, string> = {
  People: 'Matches ranked by shared skills, interests and goals — with the reason shown.',
  'Skill swap': 'Teach what you know, learn what you want. Reciprocal matches only.',
  Groups: 'Interest groups with a feed and a group chat.',
  Communities: 'Moderated spaces with posts, polls and channels.',
  Activities: 'Post a study session or a pickup game; RSVP in one tap.',
  Hangouts: 'Small plans with a member limit that close when full.',
  Events: 'Movie nights, karaoke, jams — RSVP with waitlists and a calendar.',
  Rides: 'Share cars and autos to Vijayawada, Guntur and the station.',
  Errands: 'Going to town? Bring something back for someone.',
  Teams: 'Find teammates by role for projects and hackathons.',
  Tutoring: 'Verified peer tutors with slots, ratings and reviews.',
  Support: 'Volunteer scribes, note-takers and mobility help, verified by staff.',
}

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 md:px-6">
          <Wordmark to="/" />
          <nav className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link to="/signup">
              <Button>Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-14 md:grid-cols-[1.1fr_0.9fr] md:items-center md:px-6 md:py-24">
          <div>
            <h1 className="text-display font-semibold tracking-[-0.02em] md:text-[40px] md:leading-[46px]">
              Find your people on campus.
            </h1>
            <p className="mt-4 max-w-md text-body text-ink-2 md:text-[17px] md:leading-7">
              frisbee matches SRM AP students by skills, interests and goals — then gives you the rides,
              events, teams and tutors to actually meet.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link to="/signup">
                <Button size="lg" full>
                  Create your profile
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="secondary" full>
                  I already have one
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-small text-ink-3">Free. Works as an app on Android and iPhone.</p>
          </div>
          <div className="flex justify-center md:justify-end">
            <img
              src="/logo-frisbee.jpg"
              alt="frisbee"
              width={320}
              height={320}
              className="w-56 rounded-md border border-line md:w-80"
            />
          </div>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6">
            <h2 className="eyebrow">What you can do</h2>
            <ul className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((m) => (
                <li key={m.label} className="flex gap-3">
                  <m.icon className="mt-0.5 size-5 shrink-0 text-ink-2" strokeWidth={1.5} />
                  <div>
                    <div className="text-h3">{m.label}</div>
                    <p className="mt-0.5 text-small text-ink-2">{BLURBS[m.label]}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-12 md:px-6">
          <h2 className="eyebrow">Install it like an app</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-center gap-2 text-h3">
                <Smartphone className="size-5" strokeWidth={1.5} /> Android
              </div>
              <p className="mt-2 text-small text-ink-2">
                Open frisbee in Chrome, then tap <strong className="font-semibold">Install</strong> when
                prompted (or ⋮ → Add to Home screen).
              </p>
            </div>
            <div className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-center gap-2 text-h3">
                <Smartphone className="size-5" strokeWidth={1.5} /> iPhone
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-1 text-small text-ink-2">
                In Safari, tap <Share className="size-4 text-info" /> <strong className="font-semibold">Share</strong>, then
                <SquarePlus className="size-4" /> <strong className="font-semibold">Add to Home Screen</strong>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface py-4">
        <Credit />
      </footer>
    </div>
  )
}
