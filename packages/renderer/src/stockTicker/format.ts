import type { StockQuoteSnapshot, StockTickerConfig } from '@pixopen/core';
import { hexToRgb } from './draw.js';

export function formatPrice(price: number): string {
  const n = Number(price);
  if (!Number.isFinite(n)) return '0.00';
  if (n >= 1000) return `${Math.round(n)}`;
  if (n >= 100) return n.toFixed(1);
  return n.toFixed(2);
}

export function formatChangePct(changePct: number): string {
  const sign = changePct > 0 ? '+' : changePct < 0 ? '-' : '';
  return `${sign}${Math.abs(changePct).toFixed(1)}%`;
}

export function changeColor(config: StockTickerConfig, changePct: number): [number, number, number] {
  if (changePct > 0.05) return hexToRgb(config.colors.up);
  if (changePct < -0.05) return hexToRgb(config.colors.down);
  return hexToRgb(config.colors.flat);
}

export function quoteLabel(config: StockTickerConfig, quote: StockQuoteSnapshot): string {
  const parts: string[] = [];
  if (config.showPrice) parts.push(formatPrice(quote.price));
  if (config.showChange) parts.push(formatChangePct(quote.changePct));
  return parts.join(' ').trim();
}
