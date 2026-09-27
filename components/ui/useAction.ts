'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

type Result<T> = { ok: true; data?: T } | { ok: false; error: string };

/** Runs a server action with a pending flag, an error message, and a refresh on success. */
export function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    <T,>(fn: () => Promise<Result<T>>, onOk?: (data: T | undefined) => void) => {
      start(async () => {
        setError(null);
        const r = await fn();
        if (!r.ok) setError(r.error);
        else {
          onOk?.(r.data);
          router.refresh();
        }
      });
    },
    [router],
  );
  return { pending, error, setError, run };
}
