import { useEffect, useRef, useState } from 'react';
import { DevicesPage } from './components/DevicesPage';
import { ProjectsPage } from './components/ProjectsPage';
import { StudioPage } from './components/StudioPage';
import { AppNav, type Tab } from './components/AppNav';
import { StudioProvider } from './studio/StudioProvider';
import { ToastProvider } from './components/Toast';
import { useSavedDevices } from './hooks/useSavedDevices';
import { useAutoConnectDevice } from './hooks/useAutoConnectDevice';
import { deviceDisplayLabel, deviceDisplayTitle } from './lib/deviceLabel';

export default function App() {
  const [tab, setTab] = useState<Tab>('projects');
  const [deviceIp, setDeviceIp] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);
  const tabMounted = useRef(false);
  const savedDevices = useSavedDevices(tab);
  useAutoConnectDevice(deviceIp, setDeviceIp);

  useEffect(() => {
    if (!tabMounted.current) {
      tabMounted.current = true;
      return;
    }
    if (tab === 'projects') setProjectsRefreshKey((k) => k + 1);
  }, [tab]);

  const openProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setTab('studio');
  };

  return (
    <ToastProvider>
    <StudioProvider
      active={tab === 'studio'}
      projectId={activeProjectId}
      onProjectIdChange={setActiveProjectId}
    >
      <div className="min-h-screen flex flex-col bg-surface-0">
        <header className="app-topbar flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3">
          <span className="text-lg font-bold tracking-tight text-fg shrink-0">Pixopen</span>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {deviceIp ? (
              <span
                className="badge badge-type-live gap-1.5 normal-case tracking-normal py-1 max-w-52 truncate"
                title={deviceDisplayTitle(savedDevices, deviceIp)}
                aria-label={`Connected to ${deviceDisplayLabel(savedDevices, deviceIp)}`}
              >
                <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
                Connected to {deviceDisplayLabel(savedDevices, deviceIp)}
              </span>
            ) : null}
          </div>
        </header>

        <div className="app-frame flex-1 flex flex-col min-h-0 w-full max-w-7xl mx-auto px-4 md:px-6 pb-4 md:pb-6">
          <AppNav tab={tab} onTabChange={setTab} />
          <main
            id="app-main-panel"
            role="tabpanel"
            aria-labelledby={`app-tab-${tab}`}
            className="app-content-panel"
          >
            {tab === 'devices' && <DevicesPage selectedIp={deviceIp} onSelect={setDeviceIp} />}
            {tab === 'projects' && (
              <ProjectsPage
                deviceIp={deviceIp}
                onDeviceIpChange={setDeviceIp}
                onOpen={openProject}
                refreshKey={projectsRefreshKey}
              />
            )}
            {tab === 'studio' && (
              <StudioPage deviceIp={deviceIp} />
            )}
          </main>
        </div>

      </div>
    </StudioProvider>
    </ToastProvider>
  );
}
