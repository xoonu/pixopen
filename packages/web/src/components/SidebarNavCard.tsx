import type { ReactNode } from 'react';

export function SidebarNavCard({
  label,
  active,
  expanded,
  onSelect,
  summary,
  children,
}: {
  label: string;
  active: boolean;
  expanded: boolean;
  onSelect: () => void;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`sidebar-nav-card${active ? ' is-active' : ''}${expanded ? ' is-expanded' : ''}`}>
      <button
        type="button"
        className="sidebar-nav-card-header"
        onClick={onSelect}
        aria-expanded={expanded}
        aria-current={active ? 'page' : undefined}
      >
        <span className="sidebar-nav-card-label">{label}</span>
        <span className="sidebar-nav-card-chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
      </button>
      {!expanded && summary ? (
        <div className="sidebar-nav-card-summary muted">{summary}</div>
      ) : null}
      {expanded ? <div className="sidebar-nav-card-body">{children}</div> : null}
    </section>
  );
}
