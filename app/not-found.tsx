import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="login-wrap">
      <div className="card login-card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44 }} aria-hidden="true">
          🎁
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', margin: '8px 0' }}>Nothing wrapped here</h1>
        <p className="muted">That page doesn’t exist, or you don’t have access to it.</p>
        <Link className="btn btn-primary" href="/">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
