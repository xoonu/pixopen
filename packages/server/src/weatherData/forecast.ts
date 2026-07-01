import type {
  WeatherCurrentSnapshot,
  WeatherDailySnapshot,
  WeatherHourlySnapshot,
  WeatherLocation,
  WeatherTemperatureUnit,
} from '@pixopen/core';

type OpenMeteoForecastResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
    precipitation_probability?: number[];
  };
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

export type ForecastData = {
  current: WeatherCurrentSnapshot;
  hourly: WeatherHourlySnapshot[];
  daily: WeatherDailySnapshot[];
};

export async function fetchForecast(
  location: WeatherLocation,
  unit: WeatherTemperatureUnit,
): Promise<ForecastData> {
  const params = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    forecast_days: '3',
    timezone: location.timezone ?? 'auto',
    temperature_unit: unit,
    wind_speed_unit: 'mph',
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = (await res.json()) as OpenMeteoForecastResponse;

  const current: WeatherCurrentSnapshot = {
    temp: Math.round(data.current?.temperature_2m ?? 0),
    weatherCode: data.current?.weather_code ?? 0,
    humidity: data.current?.relative_humidity_2m,
    windSpeed: data.current?.wind_speed_10m != null
      ? Math.round(data.current.wind_speed_10m)
      : undefined,
  };

  const hourly: WeatherHourlySnapshot[] = [];
  const hTimes = data.hourly?.time ?? [];
  const hTemps = data.hourly?.temperature_2m ?? [];
  const hCodes = data.hourly?.weather_code ?? [];
  const hPrecip = data.hourly?.precipitation_probability ?? [];
  const now = Date.now();
  for (let i = 0; i < hTimes.length && hourly.length < 12; i++) {
    const t = hTimes[i];
    if (!t) continue;
    const timeMs = new Date(t).getTime();
    if (timeMs < now - 30 * 60_000) continue;
    hourly.push({
      time: t,
      temp: Math.round(hTemps[i] ?? 0),
      weatherCode: hCodes[i] ?? 0,
      precipProb: hPrecip[i],
    });
  }

  const daily: WeatherDailySnapshot[] = [];
  const dTimes = data.daily?.time ?? [];
  const dMax = data.daily?.temperature_2m_max ?? [];
  const dMin = data.daily?.temperature_2m_min ?? [];
  const dCodes = data.daily?.weather_code ?? [];
  for (let i = 0; i < Math.min(3, dTimes.length); i++) {
    daily.push({
      date: dTimes[i] ?? '',
      tempMax: Math.round(dMax[i] ?? 0),
      tempMin: Math.round(dMin[i] ?? 0),
      weatherCode: dCodes[i] ?? 0,
    });
  }

  return { current, hourly, daily };
}
