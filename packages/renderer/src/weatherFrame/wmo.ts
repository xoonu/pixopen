import type { WeatherSpriteId } from './spriteData.js';

export type WeatherIconCategory =
  | 'clear'
  | 'partlyCloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder'
  | 'unknown';

export function wmoToSpriteId(code: number): WeatherSpriteId {
  if (code === 0) return 'sun';
  if (code === 1 || code === 2) return 'cloud_sun';
  if (code === 3) return 'clouds';
  if (code === 45 || code === 48) return 'wind';
  if (code >= 51 && code <= 55) return 'rain0';
  if (code === 56 || code === 57) return 'rain1';
  if (code >= 61 && code <= 65) return code >= 65 ? 'rain2' : 'rain1';
  if (code === 66 || code === 67) return 'rain2';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return code === 80 ? 'rain0' : code === 81 ? 'rain1' : 'rain2';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95) return 'rain_lightning';
  return 'cloud';
}

export function wmoToCategory(code: number): WeatherIconCategory {
  if (code === 0) return 'clear';
  if (code === 1 || code === 2) return 'partlyCloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code >= 71 && code <= 77 || code >= 85 && code <= 86) return 'snow';
  if (code >= 95 && code <= 99) return 'thunder';
  return 'unknown';
}

export function wmoShortLabel(code: number): string {
  const cat = wmoToCategory(code);
  switch (cat) {
    case 'clear':
      return 'CLEAR';
    case 'partlyCloudy':
      return 'PARTLY';
    case 'cloudy':
      return 'CLOUDY';
    case 'fog':
      return 'FOG';
    case 'drizzle':
      return 'DRIZZLE';
    case 'rain':
      return 'RAIN';
    case 'snow':
      return 'SNOW';
    case 'thunder':
      return 'STORM';
    default:
      return 'WX';
  }
}

export function formatLocationName(name: string): string {
  return name.toUpperCase().replace(/[^A-Z0-9 ,.-]/g, '').trim().replace(/\s+/g, ' ');
}
