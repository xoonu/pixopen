import { normalizeOnAirAppConfig, ON_AIR_MESSAGE_LABELS, type Project } from '@pixopen/core';
import { OnAirPreview } from './OnAirPreview';

type Props = {
  project: Project;
};

/** Sidebar panel — live preview of the status plaque. */
export function OnAirPanel({ project }: Props) {
  const config = normalizeOnAirAppConfig(project.appConfig);

  return (
    <section className="on-air-sidebar-panel" aria-label="On Air">
      <h3 className="on-air-section-title">On Air</h3>
      <div className="on-air-sidebar-preview">
        <OnAirPreview
          key={`${config.message}|${config.pulse ? 1 : 0}`}
          appConfig={project.appConfig}
          scale={3}
          playing
        />
      </div>
      <p className="on-air-status-label m-0">
        Showing: <strong>{ON_AIR_MESSAGE_LABELS[config.message]}</strong>
      </p>
      <p className="muted text-xs m-0">
        Hit <strong>Run on Pixoo</strong> above to stream the sign to your device.
      </p>
    </section>
  );
}
