'use client';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useAction } from '@/components/ui/useAction';
import { DEPARTMENTS, type Department } from '@/lib/types';
import { inviteMember } from './actions';

export function InviteForm({ loginUrl }: { loginUrl: string }) {
  const [f, setF] = useState({ email: '', fullName: '', role: 'member', department: 'artisan' as Department | '' });
  const [sent, setSent] = useState<string | null>(null);
  const { pending, error, run } = useAction();

  return (
    <section className="card">
      <h2 style={{ marginTop: 0, fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <UserPlus size={18} aria-hidden="true" /> Invite someone
      </h2>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          setSent(null);
          run(() => inviteMember({ ...f, department: f.department || null }), () => {
            setSent(f.email.trim().toLowerCase());
            setF((s) => ({ ...s, email: '', fullName: '' }));
          });
        }}
      >
        <div className="field">
          <label htmlFor="inv-name">Name</label>
          <input id="inv-name" required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="Riya Sharma" />
        </div>
        <div className="field">
          <label htmlFor="inv-email">Email</label>
          <input id="inv-email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="riya@gmail.com" />
          <span className="hint">Use the Google account they’ll sign in with, if they have one.</span>
        </div>
        <div className="form">
          <div className="field">
            <label htmlFor="inv-role">Role</label>
            <select id="inv-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="member">Team member</option>
              <option value="trainer">Trainer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="inv-dept">Department</label>
            <select id="inv-dept" value={f.department} onChange={(e) => setF({ ...f, department: e.target.value as Department | '' })}>
              {(Object.keys(DEPARTMENTS) as Department[]).map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENTS[d]}
                </option>
              ))}
              <option value="">None</option>
            </select>
          </div>
        </div>
        {error && (
          <p className="notice err" role="alert" style={{ margin: 0 }}>
            {error}
          </p>
        )}
        {sent && (
          <p className="notice ok" role="status" style={{ margin: 0 }}>
            Invited <b>{sent}</b>. Send them this link on WhatsApp: <b>{loginUrl}</b>. They sign in with that email or its Google account.
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Inviting…' : 'Send invite'}
        </button>
      </form>
    </section>
  );
}
