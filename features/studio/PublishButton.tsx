'use client';
import { useAction } from '@/components/ui/useAction';
import { setCoursePublished } from './actions';

export function PublishButton({ id, published }: { id: string; published: boolean }) {
  const { pending, error, run } = useAction();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button
        type="button"
        className={`btn ${published ? 'btn-ghost' : 'btn-primary'}`}
        disabled={pending}
        onClick={() => run(() => setCoursePublished({ id, published: !published }))}
      >
        {pending ? 'Saving…' : published ? 'Unpublish' : 'Publish course'}
      </button>
      {error && (
        <span className="small" role="alert" style={{ color: 'var(--red-deep)', maxWidth: 280, textAlign: 'right' }}>
          {error}
        </span>
      )}
    </div>
  );
}
