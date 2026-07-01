import { useEffect, useRef, useState } from 'react';
import {
  normalizeWeatherFrameAppConfig,
  type WeatherFrameConfig,
  type WeatherLocation,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { WeatherPreview } from './WeatherPreview';
import { api } from '../lib/api';

type Props = {
  project: Project;
  onChange: (appConfig: Record<string, unknown>) => void;
};

function formatLocationLabel(loc: WeatherLocation): string {
  const parts = [loc.name];
  if (loc.admin1) parts.push(loc.admin1);
  if (loc.country) parts.push(loc.country);
  return parts.join(', ');
}

const PREVIEW_SCALE = 8;

export function WeatherStudio({ project, onChange }: Props) {
  const config = normalizeWeatherFrameAppConfig(project.appConfig);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WeatherLocation[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const applyConfig = (next: WeatherFrameConfig) => {
    onChange({ ...next });
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearchBusy(false);
      return;
    }
    setSearchBusy(true);
    searchTimer.current = setTimeout(() => {
      void api.weather
        .geocode(q)
        .then((res) => {
          setSearchResults(res.results);
          setSearchOpen(true);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchBusy(false));
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  const selectLocation = (loc: WeatherLocation) => {
    applyConfig({ ...config, location: loc });
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  const clearLocation = () => {
    applyConfig({ ...config, location: undefined });
  };

  return (
    <div className="weather-frame-studio">
      <section className="weather-frame-preview-panel" aria-label="Weather preview">
        <span className="field-label">Preview</span>
        <div className="weather-frame-preview-stage">
          <WeatherPreview appConfig={project.appConfig} scale={PREVIEW_SCALE} playing />
        </div>
      </section>

      <section className="weather-frame-location-panel">
        <h3 className="weather-frame-section-title">Location</h3>
        {config.location ? (
          <div className="weather-frame-location-chip">
            <span>{formatLocationLabel(config.location)}</span>
            <button type="button" className="btn btn-ghost btn-xs" onClick={clearLocation}>
              Remove
            </button>
          </div>
        ) : (
          <p className="muted weather-frame-location-hint">Search for a city or place to show weather.</p>
        )}
        <div className="weather-frame-search-wrap" ref={searchWrapRef}>
          <Field label="Search" htmlFor="weather-location-search">
            <input
              id="weather-location-search"
              type="search"
              className="input w-full"
              placeholder="Brooklyn, London, Tokyo…"
              value={searchQuery}
              autoComplete="off"
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            />
          </Field>
          {searchBusy ? <p className="muted text-xs m-0">Searching…</p> : null}
          {searchOpen && searchResults.length > 0 ? (
            <ul className="weather-frame-search-results" role="listbox">
              {searchResults.map((loc, i) => (
                <li key={`${loc.lat}-${loc.lon}-${i}`}>
                  <button
                    type="button"
                    role="option"
                    className="weather-frame-search-result"
                    onClick={() => selectLocation(loc)}
                  >
                    {formatLocationLabel(loc)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {searchOpen && !searchBusy && searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
            <p className="muted text-xs m-0">No places found.</p>
          ) : null}
        </div>
      </section>

      <section className="weather-frame-display-panel">
        <h3 className="weather-frame-section-title">Units</h3>
        <Field label="Temperature scale" htmlFor="weather-temp-unit">
          <select
            id="weather-temp-unit"
            className="select w-full"
            value={config.temperatureUnit}
            onChange={(e) =>
              applyConfig({
                ...config,
                temperatureUnit: e.target.value === 'celsius' ? 'celsius' : 'fahrenheit',
              })
            }
          >
            <option value="fahrenheit">Fahrenheit</option>
            <option value="celsius">Celsius</option>
          </select>
        </Field>
        <p className="muted text-xs m-0 mt-2">
          Shows current temperature, conditions, humidity, and wind for your location.
        </p>
      </section>
    </div>
  );
}
