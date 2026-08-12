import { CANVAS_SIZE } from '@pixopen/core';
import type { WeatherSpriteId } from './spriteData.js';
import { WEATHER_SPRITES, WEATHER_SPRITE_SIZE } from './spriteData.js';

export { setPx, fillRect, hexToRgb, drawText, drawTextClipped, textWidth } from '../stockTicker/draw.js';

export const WEATHER_ICON_SIZE = WEATHER_SPRITE_SIZE;

/** Soft-blit a 32×32 Weather Icons alpha sprite (Erik Flowers). */
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
      const a = (sprite.alpha[row * sprite.width + col] ?? 0) / 255;
      if (a <= 0.02) continue;
      const px = x + col;
      const py = y + row;
      if (px < 0 || py < 0 || px >= CANVAS_SIZE || py >= CANVAS_SIZE) continue;
      const i = (py * CANVAS_SIZE + px) * 4;
      pixels[i] = Math.round(pixels[i] + (color[0] - pixels[i]) * a);
      pixels[i + 1] = Math.round(pixels[i + 1] + (color[1] - pixels[i + 1]) * a);
      pixels[i + 2] = Math.round(pixels[i + 2] + (color[2] - pixels[i + 2]) * a);
      pixels[i + 3] = 255;
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
