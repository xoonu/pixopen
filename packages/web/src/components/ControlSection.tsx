import type { ReactNode } from 'react';

export function ControlSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="control-section">
      <div className="control-section-header">
        <h4 className="control-section-title">{title}</h4>
        {hint && <p className="control-section-hint muted">{hint}</p>}
      </div>
      <div className="control-section-body">{children}</div>
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  inline,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={`field${inline ? ' field-inline' : ''}`}>
      <label className="field-label label-text" htmlFor={htmlFor}>{label}</label>
      <div className="field-control w-full">{children}</div>
      {hint && <p className="field-hint text-xs opacity-60">{hint}</p>}
    </div>
  );
}

export function ToolButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button type="button" className={`btn btn-sm btn-square${active ? ' btn-primary' : ' btn-ghost'}`} onClick={onClick} title={title}>
      {children}
    </button>
  );
}
