import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Wrap It Up University home">
      <span className="logo-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="10" width="18" height="11" rx="2" />
          <path d="M12 10v11M3 14h18" />
          <path d="M12 10c-2.5 0-5-1-5-3.2C7 5 8.4 4 9.6 4 11.6 4 12 7 12 10zM12 10c2.5 0 5-1 5-3.2C17 5 15.6 4 14.4 4 12.4 4 12 7 12 10z" />
        </svg>
      </span>
      <span>
        <b>Wrap It Up</b> <span>University</span>
      </span>
    </Link>
  );
}
