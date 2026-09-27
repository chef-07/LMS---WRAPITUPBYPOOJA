import Link from 'next/link';
import { firstName, greeting } from '@/lib/format';

export function Hero({
  name,
  streak,
  resume,
}: {
  name: string;
  streak: number;
  resume: { href: string; courseTitle: string } | null;
}) {
  const eyebrow =
    streak > 0 ? `Day streak · ${streak} ${streak === 1 ? 'day' : 'days'} and counting` : 'Welcome to Wrap It Up University';
  return (
    <section className="hero" aria-label="Welcome">
      <BowArt />
      <div className="eyebrow">{eyebrow}</div>
      <h2>
        {greeting()}, {firstName(name)}.
      </h2>
      <p>Every perfect gift starts with one neat fold. Pick up where you left off.</p>
      <div className="hero-actions">
        {resume ? (
          <Link className="btn btn-white" href={resume.href}>
            Continue {resume.courseTitle}
          </Link>
        ) : (
          <Link className="btn btn-white" href="/schools">
            Browse the schools
          </Link>
        )}
        <Link className="btn btn-glass" href="/sops">
          Open SOP library
        </Link>
      </div>
    </section>
  );
}

/** Ribbons and a bow, drawn in white so they sit on any part of the gradient. */
function BowArt() {
  return (
    <svg className="hero-art" viewBox="0 0 420 260" fill="none" aria-hidden="true">
      <g stroke="rgba(255,255,255,0.35)" strokeWidth="14" strokeLinecap="round">
        <path d="M250 -20 C 270 80, 330 120, 440 140" />
        <path d="M200 280 C 240 190, 320 170, 440 190" />
      </g>
      <g fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.6)" strokeWidth="3">
        <path d="M320 120 C 270 70, 240 110, 262 140 C 280 164, 310 140, 320 120 Z" />
        <path d="M320 120 C 370 70, 400 110, 378 140 C 360 164, 330 140, 320 120 Z" />
        <circle cx="320" cy="122" r="12" fill="rgba(255,255,255,0.7)" />
        <path d="M312 132 L 292 200 M 328 132 L 350 196" strokeWidth="8" strokeLinecap="round" />
      </g>
      <g fill="rgba(255,255,255,0.55)">
        <circle cx="180" cy="40" r="4" />
        <circle cx="400" cy="40" r="3" />
        <circle cx="230" cy="220" r="3" />
        <path d="M130 170 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" />
      </g>
    </svg>
  );
}
