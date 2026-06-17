import { useEffect, useState } from 'react';
import { DevicesPage } from './components/DevicesPage';
import { ProjectsPage } from './components/ProjectsPage';
import { StudioPage } from './components/StudioPage';
import { SidebarNavCard } from './components/SidebarNavCard';
import { ProjectsSidebarPanel } from './components/sidebar/ProjectsSidebarPanel';
import { DevicesSidebarPanel } from './components/sidebar/DevicesSidebarPanel';
import { StudioSidebarPanel } from './components/sidebar/StudioSidebarPanel';
import { StudioProvider } from './studio/StudioProvider';
import { api } from './lib/api';

type Tab = 'devices' | 'projects' | 'studio';

export default function App() {
  const [tab, setTab] = useState<Tab>('projects');
  const [deviceIp, setDeviceIp] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [sidebarStatus, setSidebarStatus] = useState('');

  useEffect(() => {
    void api.health().then(() => setOnline(true)).catch(() => setOnline(false));
  }, []);

  const openProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setTab('studio');
  };

  return (
    <StudioProvider
      active={tab === 'studio'}
      projectId={activeProjectId}
      onProjectIdChange={setActiveProjectId}
      onProjectChange={(project) => setActiveProjectName(project?.name ?? null)}
    >
      <div className="app-shell">
        <aside className="sidebar">
          <h1>Pixopen</h1>

          <nav className="sidebar-nav" aria-label="Main">
            <SidebarNavCard
              label="Projects"
              active={tab === 'projects'}
              expanded={tab === 'projects'}
              onSelect={() => setTab('projects')}
              summary="Create from the app library"
            >
              <ProjectsSidebarPanel
                onOpen={openProject}
                onStatus={setSidebarStatus}
              />
            </SidebarNavCard>

            <SidebarNavCard
              label="Studio"
              active={tab === 'studio'}
              expanded={tab === 'studio'}
              onSelect={() => setTab('studio')}
              summary={activeProjectName ?? (activeProjectId ? 'Project open' : 'No project open')}
            >
              <StudioSidebarPanel
                deviceIp={deviceIp}
                onProjectIdChange={setActiveProjectId}
              />
            </SidebarNavCard>

            <SidebarNavCard
              label="Devices"
              active={tab === 'devices'}
              expanded={tab === 'devices'}
              onSelect={() => setTab('devices')}
              summary={deviceIp || 'No Pixoo selected'}
            >
              <DevicesSidebarPanel
                selectedIp={deviceIp}
                onSelect={setDeviceIp}
                onStatus={setSidebarStatus}
              />
            </SidebarNavCard>
          </nav>

          <div className="sidebar-status">
            <p className="muted"><span className="status-label">Server</span> {online ? 'Connected' : 'Offline'}</p>
            <p className="muted"><span className="status-label">Pixoo</span> {deviceIp || 'Not selected'}</p>
            {sidebarStatus ? <p className="sidebar-status-msg muted">{sidebarStatus}</p> : null}
          </div>
        </aside>
        <main className="main">
          {tab === 'devices' && <DevicesPage selectedIp={deviceIp} onSelect={setDeviceIp} />}
          {tab === 'projects' && <ProjectsPage onOpen={openProject} />}
          {tab === 'studio' && <StudioPage />}
        </main>
      </div>
    </StudioProvider>
  );
}
