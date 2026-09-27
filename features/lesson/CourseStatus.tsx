import { Award, CheckCircle2, Circle, Download } from 'lucide-react';
import Link from 'next/link';
import type { CourseAssessment } from '@/lib/types';

/** Where the learner stands on the way to the certificate. */
export function CourseStatus({ assessment }: { assessment: CourseAssessment }) {
  const { progress: p, certificate } = assessment;
  if (certificate) {
    return (
      <section className="card cert-card">
        <h2 style={{ margin: '0 0 4px', fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Award size={18} aria-hidden="true" /> Course complete!
        </h2>
        <p className="muted small" style={{ margin: '0 0 12px' }}>
          Certificate {certificate.code}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-white btn-sm" href={`/verify/${certificate.code}`}>
            View certificate
          </Link>
          <a className="btn btn-glass btn-sm" href={`/verify/${certificate.code}/pdf`}>
            <Download size={14} aria-hidden="true" /> PDF
          </a>
        </div>
      </section>
    );
  }
  const rows = [
    { label: 'Lessons', ...p.lessons },
    ...(p.quizzes.total ? [{ label: 'Quizzes passed', ...p.quizzes }] : []),
    ...(p.practicals.total ? [{ label: 'Practicals approved', ...p.practicals }] : []),
  ];
  return (
    <section className="card">
      <h2 style={{ margin: '0 0 10px', fontSize: 15, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Award size={17} color="var(--sunshine-deep)" aria-hidden="true" /> Your certificate
      </h2>
      <ul className="req-list">
        {rows.map((r) => (
          <li key={r.label}>
            {r.done >= r.total ? <CheckCircle2 size={16} color="var(--turquoise-deep)" aria-hidden="true" /> : <Circle size={16} color="var(--ink-4)" aria-hidden="true" />}
            <span style={{ flex: 1 }}>{r.label}</span>
            <b>
              {r.done}/{r.total}
            </b>
          </li>
        ))}
      </ul>
    </section>
  );
}
