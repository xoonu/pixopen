import { CANVAS_SIZE, type WeatherFrameConfig, type WeatherSnapshot } from '@pixopen/core';
import { drawText, drawTextClipped, fillRect, hexToRgb, textWidth } from './icons.js';
import { drawWeatherIcon, weatherIconColor } from './icons.js';
import { drawFigtreeTemp, figtreeTempScale, figtreeTempSize } from './tempText.js';
import { formatLocationName, wmoShortLabel, wmoToSpriteId } from './wmo.js';

const LOCATION_PAD = 2;
const HEADER_H = 34;
const ICON_X = 0;
const ICON_Y = 0;
const TEMP_COL_X = 34;
const TEMP_COL_W = CANVAS_SIZE - TEMP_COL_X;
const TEMP_INSET = 0;

function drawLocationName(
  pixels: number[],
  name: string,
  y: number,
  color: [number, number, number],
  elapsedMs: number,
) {
  const label = formatLocationName(name);
  if (!label) return;

  const maxW = CANVAS_SIZE - LOCATION_PAD * 2;
  const w = textWidth(label, 1);

  if (w <= maxW) {
    drawText(pixels, Math.floor((CANVAS_SIZE - w) / 2), y, label, color, 1);
    return;
  }

  const gap = 12;
  const loop = w + gap;
  const offset = Math.floor(elapsedMs / 40) % loop;
  drawTextClipped(pixels, LOCATION_PAD - offset, y, label, color, 0, CANVAS_SIZE, 1);
  drawTextClipped(pixels, LOCATION_PAD - offset + loop, y, label, color, 0, CANVAS_SIZE, 1);
}

export function drawPlaceholderPane(
  pixels: number[],
  config: WeatherFrameConfig,
  message = 'SET LOC',
) {
  const bg = hexToRgb(config.colors.background);
  const text = hexToRgb(config.colors.text);
  const muted = hexToRgb(config.colors.muted);
  fillRect(pixels, 0, 0, CANVAS_SIZE, CANVAS_SIZE, bg);
  const scale = 2;
  const w = textWidth(message, scale);
  drawText(pixels, Math.floor((CANVAS_SIZE - w) / 2), 24, message, text, scale);
  drawText(pixels, 8, 52, 'WEATHER', muted, 1);
}

export function drawCurrentPane(
  pixels: number[],
  config: WeatherFrameConfig,
  snapshot: WeatherSnapshot,
  elapsedMs: number,
) {
  const bg = hexToRgb(config.colors.background);
  const text = hexToRgb(config.colors.text);
  const accent = hexToRgb(config.colors.accent);
  const muted = hexToRgb(config.colors.muted);
  fillRect(pixels, 0, 0, CANVAS_SIZE, CANVAS_SIZE, bg);

  const spriteId = wmoToSpriteId(snapshot.current.weatherCode);
  drawWeatherIcon(
    pixels,
    ICON_X,
    ICON_Y,
    spriteId,
    weatherIconColor(spriteId, text),
  );

  const tempStr = String(Math.round(snapshot.current.temp));
  const tempMaxW = TEMP_COL_W - TEMP_INSET * 2;
  const tempMaxH = HEADER_H - 2;
  const tempScale = figtreeTempScale(tempStr, tempMaxW, tempMaxH);
  const { w: tempW, h: tempH } = figtreeTempSize(tempStr, tempScale);
  const tempX = TEMP_COL_X + TEMP_INSET + Math.floor((tempMaxW - tempW) / 2);
  const tempY = Math.floor((HEADER_H - tempH) / 2);
  drawFigtreeTemp(pixels, tempX, tempY, tempStr, text, tempScale);

  drawLocationName(pixels, snapshot.location.name, 36, accent, elapsedMs);

  const label = wmoShortLabel(snapshot.current.weatherCode);
  const labelW = textWidth(label, 1);
  drawText(pixels, Math.floor((CANVAS_SIZE - labelW) / 2), 46, label, muted, 1);

  const detailY = 56;
  if (snapshot.current.humidity != null) {
    drawText(pixels, 2, detailY, `H${snapshot.current.humidity}%`, muted, 1);
  }
  if (snapshot.current.windSpeed != null) {
    const wind = `${snapshot.current.windSpeed}MPH`;
    drawText(pixels, CANVAS_SIZE - 2 - textWidth(wind), detailY, wind, muted, 1);
  }
}
