import {
  normalizeWeatherFrameAppConfig,
  type WeatherFrameConfig,
  type WeatherFrameTheme,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

function colorInputValue(hex: string): string {
  const normalized = hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`;
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#0c1824';
}

function HexColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <Field label={label} htmlFor={id}>
      <div className="weather-frame-color-picker-row">
        <input
          id={id}
          type="color"
          value={colorInputValue(value)}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          value={value}
          spellCheck={false}
          aria-label={`${label} hex`}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

const THEME_PRESETS: Record<WeatherFrameTheme, WeatherFrameConfig['colors']> = {
  sky: {
    background: '#0c1824',
    text: '#e8f0f8',
    accent: '#59c2ff',
    muted: '#6a8499',
  },
  night: {
    background: '#0a0e18',
    text: '#c8d0e0',
    accent: '#8899ff',
    muted: '#556677',
  },
  minimal: {
    background: '#111111',
    text: '#eeeeee',
    accent: '#cccccc',
    muted: '#888888',
  },
};

/** Appearance controls — lives in the Weather studio sidebar. */
export function WeatherPanel({ project, onChange }: Props) {
  const config = normalizeWeatherFrameAppConfig(project.appConfig);

  const applyConfig = (next: WeatherFrameConfig) => {
    onChange({ ...next });
  };

  const applyTheme = (theme: WeatherFrameTheme) => {
    applyConfig({ ...config, theme, colors: { ...THEME_PRESETS[theme] } });
  };

  return (
    <>
      <section className="weather-frame-sidebar-panel" aria-label="Weather appearance">
        <h3 className="weather-frame-section-title">Appearance</h3>
        <div className="weather-frame-sidebar-fields">
          <Field label="Theme preset" htmlFor="weather-frame-theme">
            <select
              id="weather-frame-theme"
              className="select w-full"
              value={config.theme}
              onChange={(e) => applyTheme(e.target.value as WeatherFrameTheme)}
            >
              <option value="sky">Sky</option>
              <option value="night">Night</option>
              <option value="minimal">Minimal</option>
            </select>
          </Field>
          <HexColorField
            id="weather-frame-bg"
            label="Background"
            value={config.colors.background}
            onChange={(background) =>
              applyConfig({ ...config, colors: { ...config.colors, background } })
            }
          />
          <HexColorField
            id="weather-frame-text"
            label="Text"
            value={config.colors.text}
            onChange={(text) => applyConfig({ ...config, colors: { ...config.colors, text } })}
          />
          <HexColorField
            id="weather-frame-accent"
            label="Accent"
            value={config.colors.accent}
            onChange={(accent) => applyConfig({ ...config, colors: { ...config.colors, accent } })}
          />
          <HexColorField
            id="weather-frame-muted"
            label="Muted"
            value={config.colors.muted}
            onChange={(muted) => applyConfig({ ...config, colors: { ...config.colors, muted } })}
          />
        </div>
      </section>

      <section className="weather-frame-sidebar-panel" aria-label="Data sources">
        <h3 className="weather-frame-section-title">Data</h3>
        <p className="muted text-xs m-0">
          Forecast from{' '}
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Open-Meteo
          </a>{' '}
          (CC BY 4.0). Weather icons by{' '}
          <a href="https://github.com/Dhole/weather-pixel-icons" target="_blank" rel="noreferrer">
            Dhole
          </a>{' '}
          (CC BY-SA 4.0).
        </p>
      </section>
    </>
  );
}
