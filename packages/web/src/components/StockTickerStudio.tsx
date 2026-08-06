import { useState } from 'react';
import {
  MAX_STOCK_TICKER_SYMBOLS,
  normalizeStockTickerAppConfig,
  type StockTickerConfig,
  type StockTickerDisplayMode,
  type StockTickerPerformancePeriod,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { NumberSlider } from './NumberSlider';
import { StockTickerPreview } from './StockTickerPreview';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

function sanitizeSymbol(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 8);
}

const PREVIEW_SCALE = 8;

export function StockTickerStudio({ project, onChange }: Props) {
  const config = normalizeStockTickerAppConfig(project.appConfig);
  const [previewPlaying, setPreviewPlaying] = useState(true);

  const applyConfig = (next: StockTickerConfig) => {
    onChange({ ...next });
  };

  const updateSymbol = (index: number, symbol: string) => {
    const next = config.symbols.map((entry, i) =>
      i === index ? { ...entry, symbol: sanitizeSymbol(symbol) } : entry,
    );
    applyConfig({ ...config, symbols: next });
  };

  const addSymbol = () => {
    if (config.symbols.length >= MAX_STOCK_TICKER_SYMBOLS) return;
    applyConfig({ ...config, symbols: [...config.symbols, { symbol: '' }] });
  };

  const removeSymbol = (index: number) => {
    if (config.symbols.length <= 1) return;
    applyConfig({ ...config, symbols: config.symbols.filter((_, i) => i !== index) });
  };

  return (
    <div className="stock-ticker-studio">
      <section className="stock-ticker-preview-panel" aria-label="Ticker preview">
        <div className="stock-ticker-preview-toolbar">
          <span className="field-label">Preview</span>
          <div className="stock-ticker-preview-controls">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setPreviewPlaying((p) => !p)}
            >
              {previewPlaying ? 'Pause' : 'Play'} animation
            </button>
          </div>
        </div>
        <div className="stock-ticker-preview-stage">
          <StockTickerPreview
            appConfig={project.appConfig}
            scale={PREVIEW_SCALE}
            playing={previewPlaying}
          />
        </div>
      </section>

      <section className="stock-ticker-symbols-panel">
        <div className="stock-ticker-symbols-header">
          <h3 className="stock-ticker-section-title">Watchlist</h3>
          <button type="button" disabled={config.symbols.length >= MAX_STOCK_TICKER_SYMBOLS} onClick={addSymbol}>
            Add symbol
          </button>
        </div>
        <p className="muted stock-ticker-symbols-hint">
          Up to {MAX_STOCK_TICKER_SYMBOLS} symbols · list mode shows 3 per page
        </p>
        <div className="stock-ticker-symbol-list">
          {config.symbols.map((entry, index) => (
            <article key={index} className="stock-ticker-symbol-row">
              <input
                className="stock-ticker-symbol-input"
                value={entry.symbol}
                placeholder="AAPL"
                maxLength={8}
                spellCheck={false}
                onChange={(e) => updateSymbol(index, e.target.value)}
              />
              {config.symbols.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-error btn-xs"
                  onClick={() => removeSymbol(index)}
                >
                  Remove
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="stock-ticker-display-panel">
        <h3 className="stock-ticker-section-title">Display</h3>
        <div className="stock-ticker-display-grid">
          <Field label="Mode" htmlFor="stock-ticker-display-mode">
            <select
              id="stock-ticker-display-mode"
              className="select w-full"
              value={config.displayMode}
              onChange={(e) =>
                applyConfig({ ...config, displayMode: e.target.value as StockTickerDisplayMode })
              }
            >
              <option value="rotate">Rotate symbols</option>
              <option value="list">Paginated list</option>
              <option value="dashboard">Dashboard card</option>
            </select>
          </Field>
          <Field label="Performance period" htmlFor="stock-ticker-period">
            <select
              id="stock-ticker-period"
              className="select w-full"
              value={config.performancePeriod}
              onChange={(e) =>
                applyConfig({
                  ...config,
                  performancePeriod: e.target.value as StockTickerPerformancePeriod,
                })
              }
            >
              <option value="1d">1 day</option>
              <option value="1w">1 week</option>
              <option value="1m">1 month</option>
              <option value="ytd">Year to date</option>
            </select>
          </Field>
        </div>
        <div className="stock-ticker-toggle-grid">
          <label className="checkbox-field">
            <input
              type="checkbox"
              className="checkbox"
              checked={config.showSymbol}
              onChange={(e) => applyConfig({ ...config, showSymbol: e.target.checked })}
            />
            <span>Symbol</span>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              className="checkbox"
              checked={config.showPrice}
              onChange={(e) => applyConfig({ ...config, showPrice: e.target.checked })}
            />
            <span>Price</span>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              className="checkbox"
              checked={config.showChange}
              onChange={(e) => applyConfig({ ...config, showChange: e.target.checked })}
            />
            <span>Change %</span>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              className="checkbox"
              checked={config.showSparkline}
              onChange={(e) => applyConfig({ ...config, showSparkline: e.target.checked })}
            />
            <span>Sparkline</span>
          </label>
        </div>
      </section>

      <section className="stock-ticker-timing-panel">
        <Field
          label={config.displayMode === 'list' ? 'Hold each page (seconds)' : 'Hold each symbol (seconds)'}
          htmlFor="stock-ticker-hold-sec"
        >
          <NumberSlider
            id="stock-ticker-hold-sec"
            min={1.5}
            max={15}
            step={0.5}
            value={config.holdMs / 1000}
            formatValue={(v) => `${v}s`}
            onChange={(sec) => applyConfig({ ...config, holdMs: Math.round(sec * 1000) })}
          />
        </Field>
      </section>
    </div>
  );
}
