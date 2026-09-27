'use client';
import { useRef, type ReactNode } from 'react';

/**
 * A destructive action behind a dialog that names exactly what will go,
 * e.g. "Delete “Sharp corners” and everyone's progress on it?".
 */
export function ConfirmButton({
  title,
  body,
  confirmLabel,
  onConfirm,
  children,
  className = 'icon-sm danger',
  label,
  disabled,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  children: ReactNode;
  className?: string;
  label: string;
  disabled?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={className} aria-label={label} title={label} disabled={disabled} onClick={() => dialog.current?.showModal()}>
        {children}
      </button>
      <dialog ref={dialog} className="confirm" aria-labelledby={undefined}>
        <h2>{title}</h2>
        <div className="muted" style={{ marginBottom: 18 }}>
          {body}
        </div>
        <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              dialog.current?.close();
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
