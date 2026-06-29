import {
  normalizeStockTickerAppConfig,
  type StockTickerConfig,
  type StockTickerTheme,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

function colorInputValue(hex: string): string {
  const normalized = hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`;
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#0a0e14';
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
      <div className="stock-ticker-color-picker-row">
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

const THEME_PRESETS: Record<StockTickerTheme, StockTickerConfig['colors']> = {
  terminal: {
    background: '#0a0e14',
    text: '#c8d4e0',
    up: '#3dd68c',
    down: '#f07178',
    flat: '#8a919a',
    accent: '#59c2ff',
  },
  minimal: {
    background: '#111111',
    text: '#eeeeee',
    up: '#44cc88',
    down: '#ee6655',
    flat: '#888888',
    accent: '#cccccc',
  },
  market: {
    background: '#0d1a12',
    text: '#e8f0ea',
    up: '#00c853',
    down: '#ff5252',
    flat: '#78909c',
    accent: '#ffd54f',
  },
};

/** Appearance controls — lives in the Stock Ticker studio sidebar. */
export function StockTickerPanel({ project, onChange }: Props) {
  const config = normalizeStockTickerAppConfig(project.appConfig);

  const applyConfig = (next: StockTickerConfig) => {
    onChange({ ...next });
  };

  const applyTheme = (theme: StockTickerTheme) => {
    applyConfig({ ...config, theme, colors: { ...THEME_PRESETS[theme] } });
  };

  return (
    <>
      <section className="stock-ticker-sidebar-panel" aria-label="Market data">
        <h3 className="stock-ticker-section-title">Market data</h3>
        <div className="stock-ticker-sidebar-fields">
          <Field label="Finnhub API key" htmlFor="stock-ticker-finnhub-key">
            <input
              id="stock-ticker-finnhub-key"
              type="password"
              className="input w-full font-mono"
              value={config.finnhubApiKey ?? ''}
              placeholder="Paste your free API key"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) =>
                applyConfig({
                  ...config,
                  finnhubApiKey: e.target.value.trim() || undefined,
                })
              }
            />
          </Field>
          <p className="muted text-xs m-0">
            Sign up at{' '}
            <a href="https://finnhub.io/register" target="_blank" rel="noreferrer">
              finnhub.io
            </a>{' '}
            and copy the <strong>API key</strong> only — skip webhook URL and secret; Pixopen
            pulls quotes on a schedule. Saved with this project.
          </p>
        </div>
      </section>

      <section className="stock-ticker-sidebar-panel stock-ticker-sidebar-panel-appearance" aria-label="Ticker appearance">
      <h3 className="stock-ticker-section-title">Appearance</h3>
      <div className="stock-ticker-sidebar-fields">
        <Field label="Theme preset" htmlFor="stock-ticker-theme">
          <select
            id="stock-ticker-theme"
            className="select w-full"
            value={config.theme}
            onChange={(e) => applyTheme(e.target.value as StockTickerTheme)}
          >
            <option value="terminal">Terminal</option>
            <option value="minimal">Minimal</option>
            <option value="market">Market</option>
          </select>
        </Field>
        <HexColorField
          id="stock-ticker-bg"
          label="Background"
          value={config.colors.background}
          onChange={(background) =>
            applyConfig({ ...config, colors: { ...config.colors, background } })
          }
        />
        <HexColorField
          id="stock-ticker-text"
          label="Text"
          value={config.colors.text}
          onChange={(text) => applyConfig({ ...config, colors: { ...config.colors, text } })}
        />
        <HexColorField
          id="stock-ticker-up"
          label="Up color"
          value={config.colors.up}
          onChange={(up) => applyConfig({ ...config, colors: { ...config.colors, up } })}
        />
        <HexColorField
          id="stock-ticker-down"
          label="Down color"
          value={config.colors.down}
          onChange={(down) => applyConfig({ ...config, colors: { ...config.colors, down } })}
        />
        <HexColorField
          id="stock-ticker-accent"
          label="Accent"
          value={config.colors.accent}
          onChange={(accent) => applyConfig({ ...config, colors: { ...config.colors, accent } })}
        />
      </div>
    </section>
    </>
  );
}
