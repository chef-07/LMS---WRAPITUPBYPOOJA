'use client';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import { deleteLiveSession } from '@/features/team-life/actions';

export function DeleteLive({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const { error, run } = useAction();
  return (
    <>
      <ConfirmButton className="btn btn-ghost btn-sm" label="Delete session" title={`Delete “${title}”?`} body="It disappears from everyone’s calendar, with its attendance list." confirmLabel="Delete" onConfirm={() => run(() => deleteLiveSession({ id }), () => router.push('/admin/live'))}>
        <Trash2 size={14} aria-hidden="true" /> Delete session
      </ConfirmButton>
      {error && <p className="notice err" style={{ margin: '8px 0 0' }}>{error}</p>}
    </>
  );
}
