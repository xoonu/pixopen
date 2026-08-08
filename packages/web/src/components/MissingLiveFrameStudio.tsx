import type { Project } from '@pixopen/core';
import { StudioChrome } from './StudioChrome';
import { hasLiveFrameStudioInThisBuild } from '../lib/liveFrameStudios';

type Props = {
  project: Project;
  deviceIp: string;
};

/**
 * Shown when a Live Frame project has a templateId but this UI build has no
 * dedicated studio branch — the old behavior was to fall through into the
 * blank drawing editor (looks like an empty Animator).
 */
export function MissingLiveFrameStudio({ project, deviceIp }: Props) {
  const knownInBuild = hasLiveFrameStudioInThisBuild(project);
  const label = project.templateId ?? 'Live Frame';

  return (
    <div className="studio-page studio-workspace-layout">
      <aside className="studio-sidebar" aria-label="Project sidebar">
        <StudioChrome deviceIp={deviceIp} />
      </aside>
      <main className="studio-main-panel min-w-0">
        <div className="grid max-w-xl gap-3 p-6">
          <h2 className="text-xl font-semibold m-0">
            {knownInBuild
              ? `${label} studio failed to open`
              : `${label} studio isn’t in this UI build`}
          </h2>
          <p className="muted text-sm m-0">
            The project was created correctly as a Live Frame
            {project.templateId ? (
              <>
                {' '}(<code>{project.templateId}</code>)
              </>
            ) : null}
            . This page was about to open the blank drawing editor — that’s blocked now.
          </p>
          <p className="text-sm m-0">
            Use the Vite Dev UI (picks up new studios immediately):
          </p>
          <pre className="rounded-lg border border-border bg-surface-0 p-3 text-xs overflow-x-auto m-0">
            npm run dev
            {'\n'}# open http://localhost:5173
          </pre>
          <p className="muted text-xs m-0">
            Or rebuild the static UI served on :3847:{' '}
            <code>npm run build -w @pixopen/web</code> then hard-refresh.
          </p>
        </div>
      </main>
    </div>
  );
}
