import { Icon, icons } from './icons';

export type Tab = 'projects' | 'studio' | 'devices';

type Props = {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
};

const TABS: { id: Tab; label: string; icon: typeof icons.projects }[] = [
  { id: 'projects', label: 'Projects', icon: icons.projects },
  { id: 'studio', label: 'Studio', icon: icons.studio },
  { id: 'devices', label: 'Devices', icon: icons.devices },
];

export function AppNav({ tab, onTabChange }: Props) {
  return (
    <nav className="app-tab-bar" aria-label="Main" role="tablist">
      {TABS.map(({ id, label, icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`app-tab-${id}`}
            aria-selected={active}
            aria-controls="app-main-panel"
            className={`app-tab${active ? ' is-active' : ''}`}
            onClick={() => onTabChange(id)}
          >
            <span className="app-tab-icon" aria-hidden="true">
              <Icon icon={icon} size={18} strokeWidth={active ? 2 : 1.75} />
            </span>
            <span className="app-tab-text">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
