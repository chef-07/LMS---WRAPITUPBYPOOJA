'use client';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { useAction } from '@/components/ui/useAction';
import { deleteSopFolder } from '@/features/team-life/actions';

export function DeleteFolder({ id, title, count, children }: { id: string; title: string; count: number; children: ReactNode }) {
  const router = useRouter();
  const { error, run } = useAction();
  return (
    <>
      <ConfirmButton
        className="btn btn-ghost btn-sm"
        label="Delete folder"
        title={`Delete “${title}”?`}
        body={`Its ${count} ${count === 1 ? 'card goes' : 'cards go'} too, including uploaded files.`}
        confirmLabel="Delete folder"
        onConfirm={() => run(() => deleteSopFolder({ id }), () => router.push('/admin/sops'))}
      >
        {children}
      </ConfirmButton>
      {error && <p className="notice err" style={{ margin: '8px 0 0' }}>{error}</p>}
    </>
  );
}
