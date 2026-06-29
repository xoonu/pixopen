import type { StockTickerPerformancePeriod } from './apps.js';

export function hashStringSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function sparklinePointCount(period: StockTickerPerformancePeriod): number {
  switch (period) {
    case '1w':
      return 7;
    case '1m':
      return 20;
    case 'ytd':
      return 24;
    default:
      return 24;
  }
}

function downsample(values: number[], target: number): number[] {
  if (values.length <= target) return values;
  const result: number[] = [];
  for (let i = 0; i < target; i++) {
    const start = Math.floor((i / target) * values.length);
    const end = Math.floor(((i + 1) / target) * values.length);
    const slice = values.slice(start, Math.max(start + 1, end));
    result.push(slice[slice.length - 1]!);
  }
  return result;
}

/** Map real closes to 0..1 for drawing — uses recent window and percent move from start. */
export function normalizeSparklineCloses(
  closes: number[],
  period: StockTickerPerformancePeriod,
): number[] {
  const series = closes.filter((v) => Number.isFinite(v) && v > 0);
  if (series.length < 2) return [];

  const maxPoints = sparklinePointCount(period);
  const recent = series.slice(-Math.max(maxPoints * 2, maxPoints));
  const sampled = downsample(recent, maxPoints);
  const first = sampled[0]!;
  const pct = sampled.map((v) => ((v - first) / first) * 100);
  const min = Math.min(...pct);
  const max = Math.max(...pct);
  const span = max - min;

  if (span < 0.02) {
    const mid = 0.5;
    const amp = Math.min(0.35, Math.max(0.12, Math.abs(pct[pct.length - 1] ?? 0) / 4));
    return sampled.map((_, i) => {
      const t = i / Math.max(1, sampled.length - 1);
      const wiggle = (seededRandom(hashStringSeed(`${first}:${i}`) + i * 13) - 0.5) * amp * 0.35;
      return Math.max(0.06, Math.min(0.94, mid + amp * (t - 0.5) + wiggle));
    });
  }

  return pct.map((v) => (v - min) / span);
}

/** Synthetic series when candle data is unavailable — period length and noise scale with scope. */
export function syntheticSparkline(
  seed: number,
  period: StockTickerPerformancePeriod,
  changePct: number,
): number[] {
  const n = sparklinePointCount(period);
  const points: number[] = [];
  let v = 0.5;
  const noiseScale = period === '1d' ? 0.14 : period === '1w' ? 0.11 : period === '1m' ? 0.09 : 0.07;
  const target = Math.max(0.08, Math.min(0.92, 0.5 + changePct / 100));

  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const drift = (target - 0.5) * t * 0.85;
    const noise = (seededRandom(seed + i * 17) - 0.5) * noiseScale;
    v = Math.max(0.06, Math.min(0.94, 0.5 + drift + noise));
    points.push(v);
  }

  if (points.length > 0) points[points.length - 1] = target;
  return points;
}
