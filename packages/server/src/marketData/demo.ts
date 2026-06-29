import type { StockQuoteSnapshot, StockTickerPerformancePeriod } from '@pixopen/core';
import { hashStringSeed, syntheticSparkline } from '@pixopen/core';

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function demoQuote(symbol: string, period: StockTickerPerformancePeriod): StockQuoteSnapshot {
  const seed = hashStringSeed(`${symbol}:${period}`);
  const base = 40 + (seed % 400) + seededRandom(seed + 1) * 120;
  const changePct = (seededRandom(seed + 2) - 0.48) * 8;
  return {
    symbol,
    price: Math.round(base * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    sparkline: syntheticSparkline(seed, period, changePct),
    fetchedAt: new Date().toISOString(),
  };
}
