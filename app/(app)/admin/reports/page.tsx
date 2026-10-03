import { AlertTriangle, BookCheck, ClipboardCheck, Download, GraduationCap, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, EmptyState, ProgressBar, StatTile } from '@/components/ui/primitives';
import { PeopleTable } from '@/features/reports/PeopleTable';
import { WeeklyChart } from '@/features/reports/WeeklyChart';
import { requireFacultyPage } from '@/lib/admin';
import { getReport } from '@/lib/reports';
import { DEPARTMENTS } from '@/lib/types';

export const metadata: Metadata = { title: 'Reports' };

const EXPORTS = [
  { type: 'people', label: 'Everyone’s progress', hint: 'One row per person: lessons, %, certificates, XP, last learned, batch.' },
  { type: 'courses', label: 'Course completion', hint: 'One row per course: assigned, started, certified, average %.' },
  { type: 'attention', label: 'Needs attention', hint: 'Overdue, behind, quiet, and practicals waiting for review.' },
];

export default async function ReportsPage() {
  await requireFacultyPage();
  const r = await getReport();
  // eslint-disable-next-line react-hooks/purity -- a server render: "now" is the moment of the request
  const now = Date.now();
  const k = r.kpis;
  return (
    <div className="page">
      <PageHeader title="Reports" crumbs={[{ label: 'Home', href: '/' }, { label: 'Reports' }]} />
      <div className="grid-4">
        <StatTile icon={Users} tone="turquoise" value={`${k.activeThisWeek}/${k.learners}`} label="Learned this week" />
        <StatTile icon={BookCheck} tone="sky" value={k.lessons30d.toLocaleString('en-IN')} label="Lessons finished" sub="last 30 days" />
        <StatTile icon={GraduationCap} tone="violet" value={k.certificates30d} label="Certificates" sub={`${k.certificatesTotal} in all`} />
        <StatTile icon={ClipboardCheck} tone="tangerine" value={k.waitingReviews} label="Waiting for review" sub={k.oldestReviewDays !== null ? `oldest ${k.oldestReviewDays} day${k.oldestReviewDays === 1 ? '' : 's'}` : undefined} />
      </div>
      <div className="content">
        <div className="col">
          <Card title="Lessons finished per week">
            <WeeklyChart weeks={r.weeks} />
          </Card>

          <Card title={`Needs attention${r.attention.length ? ` · ${r.attention.length}` : ''}`}>
            {r.attention.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="Nothing needs you" body="Nobody is overdue, quiet for weeks, or waiting on a review." />
            ) : (
              <div className="list">
                {r.attention.map((a) => (
                  <Link key={a.key} href={a.href} className="list-row">
                    <span className={`sev ${a.severity}`} aria-hidden="true" />
                    <div className="grow">
                      <div className="title">
                        {a.who}: {a.what}
                      </div>
                      <div className="muted small">{a.detail}</div>
                    </div>
                    <span className={`chip ${a.severity === 'high' ? 'off' : 'warn'}`}>{a.severity === 'high' ? 'Urgent' : 'Check in'}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card title="By team">
            <div className="table-scroll" role="region" aria-label="Progress by team (scrolls sideways)" tabIndex={0}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Team</th>
                    <th scope="col" className="num">People</th>
                    <th scope="col" className="num hide-sm">Learned this week</th>
                    <th scope="col">Average completion</th>
                    <th scope="col" className="num hide-sm">Certificates</th>
                    <th scope="col" className="num">Need attention</th>
                  </tr>
                </thead>
                <tbody>
                  {r.departments.map((d) => (
                    <tr key={d.key}>
                      <td>
                        <b>{d.key === 'none' ? 'No team' : DEPARTMENTS[d.key]}</b>
                      </td>
                      <td className="num">{d.people}</td>
                      <td className="num hide-sm">{d.active}</td>
                      <td style={{ minWidth: 120 }}>
                        <ProgressBar pct={d.avgPct} label={`Average completion ${d.avgPct}%`} />
                        <span className="muted small">{d.avgPct}%</span>
                      </td>
                      <td className="num hide-sm">{d.certificates}</td>
                      <td className="num">{d.attention}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Courses">
            <div className="table-scroll" role="region" aria-label="Course completion (scrolls sideways)" tabIndex={0}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Course</th>
                    <th scope="col" className="num">Assigned</th>
                    <th scope="col" className="num">Started</th>
                    <th scope="col" className="num">Certified</th>
                    <th scope="col" className="hide-sm">Average progress</th>
                  </tr>
                </thead>
                <tbody>
                  {r.courses.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <b>{c.title}</b>
                      </td>
                      <td className="num">{c.assigned}</td>
                      <td className="num">{c.started}</td>
                      <td className="num">{c.certified}</td>
                      <td className="hide-sm" style={{ minWidth: 120 }}>
                        <ProgressBar pct={c.avgPct} label={`${c.title}: average ${c.avgPct}%`} />
                        <span className="muted small">{c.avgPct}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <PeopleTable people={r.people} now={now} />
        </div>

        <aside className="col rail">
          <Card title="Download for Excel">
            <div className="download-list">
              {EXPORTS.map((e) => (
                <div key={e.type}>
                  <a className="btn btn-ghost" href={`/admin/reports/export?type=${e.type}`} download style={{ justifyContent: 'flex-start', width: '100%' }}>
                    <Download size={16} aria-hidden="true" /> {e.label}
                  </a>
                  <div className="muted small" style={{ margin: '4px 4px 0' }}>
                    {e.hint}
                  </div>
                </div>
              ))}
            </div>
            <p className="muted small" style={{ margin: '12px 0 0' }}>
              CSV files open in Excel or Google Sheets.
            </p>
          </Card>
          <p className="muted small" style={{ margin: 0 }}>
            Completion counts the courses each person’s team is assigned. The founder account is left out of every number.
          </p>
        </aside>
      </div>
    </div>
  );
}
