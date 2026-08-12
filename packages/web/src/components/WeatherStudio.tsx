import { useEffect, useRef, useState } from 'react';
import {
  MAX_WEATHER_LOCATIONS,
  normalizeWeatherFrameAppConfig,
  type WeatherFrameConfig,
  type WeatherLocation,
  type Project,
} from '@pixopen/core';
import { Field } from './ControlSection';
import { NumberSlider } from './NumberSlider';
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

function locationKey(loc: WeatherLocation): string {
  return `${loc.lat.toFixed(4)}:${loc.lon.toFixed(4)}`;
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

  const addLocation = (loc: WeatherLocation) => {
    if (config.locations.length >= MAX_WEATHER_LOCATIONS) return;
    const key = locationKey(loc);
    if (config.locations.some((entry) => locationKey(entry) === key)) {
      setSearchQuery('');
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    applyConfig({ ...config, locations: [...config.locations, loc] });
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  const removeLocation = (index: number) => {
    applyConfig({
      ...config,
      locations: config.locations.filter((_, i) => i !== index),
    });
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
        <div className="weather-frame-location-header">
          <h3 className="weather-frame-section-title">Locations</h3>
          <span className="muted text-xs">
            {config.locations.length}/{MAX_WEATHER_LOCATIONS}
          </span>
        </div>
        {config.locations.length === 0 ? (
          <p className="muted weather-frame-location-hint">
            Search and add cities — the board cycles through them.
          </p>
        ) : (
          <ul className="weather-frame-location-list">
            {config.locations.map((loc, index) => (
              <li key={`${locationKey(loc)}-${index}`} className="weather-frame-location-chip">
                <span>{formatLocationLabel(loc)}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => removeLocation(index)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="weather-frame-search-wrap" ref={searchWrapRef}>
          <Field label="Add location" htmlFor="weather-location-search">
            <input
              id="weather-location-search"
              type="search"
              className="input w-full"
              placeholder="Brooklyn, London, Tokyo…"
              value={searchQuery}
              autoComplete="off"
              disabled={config.locations.length >= MAX_WEATHER_LOCATIONS}
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
                    onClick={() => addLocation(loc)}
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
        <h3 className="weather-frame-section-title">Display</h3>
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
        <Field
          label="Seconds per location"
          htmlFor="weather-hold-sec"
          hint={
            config.locations.length <= 1
              ? 'Add more locations to cycle the board.'
              : undefined
          }
        >
          <NumberSlider
            id="weather-hold-sec"
            min={3}
            max={15}
            step={0.5}
            value={config.holdMs / 1000}
            formatValue={(v) => `${v}s`}
            disabled={config.locations.length <= 1}
            onChange={(sec) => applyConfig({ ...config, holdMs: Math.round(sec * 1000) })}
          />
        </Field>
      </section>
    </div>
  );
}
