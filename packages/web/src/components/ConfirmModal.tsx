import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = 'confirm-modal-title';

  return (
    <div
      className="modal-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="modal-panel confirm-modal p-5">
        <h3 id={titleId} className="font-bold text-lg m-0">{title}</h3>
        <div className="text-sm text-muted mt-2">{children}</div>
        <div className="flex justify-end flex-wrap gap-2 mt-5">
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn btn-sm${tone === 'danger' ? ' btn-danger' : ' btn-primary'}`}
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? <span className="spinner" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
