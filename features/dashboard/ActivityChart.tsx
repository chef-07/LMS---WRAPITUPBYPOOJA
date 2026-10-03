/** Seven bars of learning minutes, drawn as inline SVG (no chart library). */
export function ActivityChart({ days }: { days: { day: string; minutes: number }[] }) {
  const max = Math.max(30, ...days.map((d) => d.minutes));
  const w = 900;
  const h = 130;
  const gap = 22;
  const bw = (w - gap * (days.length - 1)) / days.length;
  const total = days.reduce((s, d) => s + d.minutes, 0);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${w} ${h + 24}`} width="100%" role="img" aria-label={`Learning minutes over the last 7 days, ${total} in total`}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4d8d" />
            <stop offset="100%" stopColor="#ff7a1a" />
          </linearGradient>
        </defs>
        {days.map((d, i) => {
          const bh = Math.max(4, (d.minutes / max) * h);
          const x = i * (bw + gap);
          const label = new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${d.day}T00:00:00Z`));
          return (
            <g key={d.day}>
              <rect x={x} y={0} width={bw} height={h} rx={10} fill="#fff3e6" />
              <rect x={x} y={h - bh} width={bw} height={bh} rx={10} fill={d.minutes ? 'url(#barGrad)' : '#f0e6da'}>
                <title>{`${label}: ${d.minutes} min`}</title>
              </rect>
              <text x={x + bw / 2} y={h + 18} textAnchor="middle" fontSize="12" fill="#6e6985">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="muted small">{total} minutes of learning this week</figcaption>
    </figure>
  );
}
