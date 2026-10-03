'use client';
import { Ban, RotateCcw, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import { RISK_LABEL, type PendingInvite, type Risk, type TeamMember } from '@/lib/admin-shared';
import { initials } from '@/lib/format';
import { DEPARTMENTS, type Department, type Role } from '@/lib/types';
import { revokeInvite, setMemberDisabled, updateMember } from './actions';

const RISKS: Risk[] = ['active', 'idle', 'stalled', 'dormant', 'never'];

function lastSeen(iso: string | null): string {
  if (!iso) return 'Never started';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  return `Active ${days} days ago`;
}

export function TeamList({ members, invites, viewerId, canEdit }: { members: TeamMember[]; invites: PendingInvite[]; viewerId: string; canEdit: boolean }) {
  const [risk, setRisk] = useState<Risk | 'all'>('all');
  const [dept, setDept] = useState<Department | 'all'>('all');
  const counts = useMemo(() => Object.fromEntries(RISKS.map((r) => [r, members.filter((m) => !m.isDisabled && m.risk === r).length])) as Record<Risk, number>, [members]);
  const shown = members.filter((m) => (risk === 'all' || (m.risk === risk && !m.isDisabled)) && (dept === 'all' || m.department === dept));

  return (
    <div className="col">
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div className="pills" role="group" aria-label="Filter by activity">
          <button type="button" className="pill-btn" aria-pressed={risk === 'all'} onClick={() => setRisk('all')}>
            Everyone · {members.length}
          </button>
          {RISKS.map((r) => (
            <button key={r} type="button" className="pill-btn" aria-pressed={risk === r} onClick={() => setRisk(r)}>
              {RISK_LABEL[r]} · {counts[r]}
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="team-dept" className="sr-only">
            Department
          </label>
          <select id="team-dept" value={dept} onChange={(e) => setDept(e.target.value as Department | 'all')}>
            <option value="all">All departments</option>
            {(Object.keys(DEPARTMENTS) as Department[]).map((d) => (
              <option key={d} value={d}>
                {DEPARTMENTS[d]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="card">
        {shown.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nobody matches this filter.
          </p>
        ) : (
          <div className="list">
            {shown.map((m) => (
              <MemberRow key={m.id} m={m} isMe={m.id === viewerId} canEdit={canEdit} />
            ))}
          </div>
        )}
      </section>

      {invites.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0, fontSize: 16 }}>Invited, not signed in yet</h2>
          <div className="list">
            {invites.map((i) => (
              <InviteRow key={i.email} invite={i} canEdit={canEdit} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function MemberRow({ m, isMe, canEdit }: { m: TeamMember; isMe: boolean; canEdit: boolean }) {
  const act = useAction();
  const change = (role: Role, department: Department | null) => act.run(() => updateMember({ id: m.id, role, department }));
  return (
    <div>
      <div className="list-row" style={m.isDisabled ? { opacity: 0.6 } : undefined}>
        <span className="avatar sm" aria-hidden="true">
          {initials(m.fullName)}
        </span>
        <div className="grow">
          <div className="title">
            {m.fullName}
            {isMe && <span className="muted"> (you)</span>}
          </div>
          <div className="muted small">
            {m.email} · {m.lessonsDone} lessons done · {lastSeen(m.lastActivityAt)}
          </div>
        </div>
        {m.isDisabled ? <span className="chip off">Access off</span> : <span className={`chip risk-${m.risk}`}>{RISK_LABEL[m.risk]}</span>}
        {canEdit ? (
          <div className="row-actions" style={{ gap: 8 }}>
            <label className="sr-only" htmlFor={`role-${m.id}`}>
              Role for {m.fullName}
            </label>
            <select id={`role-${m.id}`} className="pill-btn" value={m.role} disabled={act.pending || isMe} onChange={(e) => change(e.target.value as Role, m.department)}>
              <option value="member">Member</option>
              <option value="trainer">Trainer</option>
              <option value="admin">Admin</option>
            </select>
            <label className="sr-only" htmlFor={`dept-${m.id}`}>
              Department for {m.fullName}
            </label>
            <select id={`dept-${m.id}`} className="pill-btn" value={m.department ?? ''} disabled={act.pending} onChange={(e) => change(m.role, (e.target.value || null) as Department | null)}>
              <option value="">No department</option>
              {(Object.keys(DEPARTMENTS) as Department[]).map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENTS[d]}
                </option>
              ))}
            </select>
            {!isMe &&
              (m.isDisabled ? (
                <button type="button" className="icon-sm" aria-label={`Restore access for ${m.fullName}`} title="Restore access" disabled={act.pending} onClick={() => act.run(() => setMemberDisabled({ id: m.id, disabled: false }))}>
                  <RotateCcw size={16} />
                </button>
              ) : (
                <ConfirmButton
                  label={`Switch off access for ${m.fullName}`}
                  title={`Switch off access for ${m.fullName}?`}
                  body="They are signed out of the university on their next click. Their progress is kept, so you can restore access later."
                  confirmLabel="Switch off access"
                  onConfirm={() => act.run(() => setMemberDisabled({ id: m.id, disabled: true }))}
                >
                  <Ban size={16} />
                </ConfirmButton>
              ))}
          </div>
        ) : (
          <span className="muted small">{m.department ? DEPARTMENTS[m.department] : m.role}</span>
        )}
      </div>
      {act.error && (
        <p className="notice err" role="alert" style={{ margin: '0 0 8px' }}>
          {act.error}
        </p>
      )}
    </div>
  );
}

function InviteRow({ invite: i, canEdit }: { invite: PendingInvite; canEdit: boolean }) {
  const act = useAction();
  return (
    <div className="list-row">
      <span className="avatar sm" aria-hidden="true">
        {initials(i.fullName || i.email)}
      </span>
      <div className="grow">
        <div className="title">{i.fullName || i.email}</div>
        <div className="muted small">
          {i.email} · {i.role}
          {i.department && ` · ${DEPARTMENTS[i.department]}`}
        </div>
      </div>
      <span className="chip warn">Invited</span>
      {canEdit && (
        <ConfirmButton
          label={`Cancel invite for ${i.email}`}
          title={`Cancel the invite for ${i.email}?`}
          body="They won’t be able to sign in unless you invite them again."
          confirmLabel="Cancel invite"
          onConfirm={() => act.run(() => revokeInvite({ email: i.email }))}
        >
          <X size={16} />
        </ConfirmButton>
      )}
      {act.error && (
        <span className="small" role="alert" style={{ color: 'var(--red-deep)' }}>
          {act.error}
        </span>
      )}
    </div>
  );
}
