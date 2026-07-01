import { CANVAS_SIZE } from '@pixopen/core';
import { setPx } from '../stockTicker/draw.js';
import type { WeatherSpriteId } from './spriteData.js';
import { WEATHER_SPRITES, WEATHER_SPRITE_SIZE } from './spriteData.js';

export { setPx, fillRect, hexToRgb, drawText, drawTextClipped, textWidth } from '../stockTicker/draw.js';

export const WEATHER_ICON_SIZE = WEATHER_SPRITE_SIZE;

/** Blit a 32×32 monochrome weather sprite from Dhole/weather-pixel-icons. */
export function drawWeatherIcon(
  pixels: number[],
  x: number,
  y: number,
  spriteId: WeatherSpriteId,
  color: [number, number, number],
) {
  const sprite = WEATHER_SPRITES[spriteId];
  for (let row = 0; row < sprite.height; row++) {
    for (let col = 0; col < sprite.width; col++) {
      if (!sprite.mask[row * sprite.width + col]) continue;
      const px = x + col;
      const py = y + row;
      if (px < 0 || py < 0 || px >= CANVAS_SIZE || py >= CANVAS_SIZE) continue;
      setPx(pixels, px, py, color);
    }
  }
}

export function weatherIconColor(
  spriteId: WeatherSpriteId,
  text: [number, number, number],
): [number, number, number] {
  if (spriteId === 'sun') return [255, 210, 70];
  if (spriteId === 'rain_lightning') return [255, 230, 90];
  return text;
}
