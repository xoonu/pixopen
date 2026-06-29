import type { StockQuoteSnapshot, StockTickerPerformancePeriod } from '@pixopen/core';
import {
  hashStringSeed,
  normalizeSparklineCloses,
  syntheticSparkline,
} from '@pixopen/core';

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
  pc?: number;
};

type FinnhubCandle = {
  c?: number[];
  t?: number[];
  s?: string;
};

export function resolveFinnhubApiKey(override?: string): string | undefined {
  const fromConfig = override?.trim();
  if (fromConfig) return fromConfig;
  const fromEnv = process.env.FINNHUB_API_KEY?.trim();
  return fromEnv || undefined;
}

export function finnhubConfigured(override?: string): boolean {
  return Boolean(resolveFinnhubApiKey(override));
}

function periodRange(period: StockTickerPerformancePeriod): { from: number; to: number; resolution: string } {
  const to = Math.floor(Date.now() / 1000);
  const day = 86400;
  switch (period) {
    case '1d':
      return { from: to - day * 2, to, resolution: '15' };
    case '1w':
      return { from: to - day * 8, to, resolution: '60' };
    case '1m':
      return { from: to - day * 35, to, resolution: 'D' };
    case 'ytd': {
      const year = new Date().getUTCFullYear();
      return { from: Math.floor(new Date(`${year}-01-01T00:00:00Z`).getTime() / 1000), to, resolution: 'D' };
    }
  }
}

function dailyChangePct(quote: FinnhubQuote): number {
  if (quote.dp != null && Number.isFinite(quote.dp)) return quote.dp;
  if (quote.d != null && quote.pc && quote.pc > 0) return (quote.d / quote.pc) * 100;
  return 0;
}

function periodChangePct(period: StockTickerPerformancePeriod, quote: FinnhubQuote, closes: number[]): number {
  if (period === '1d') return dailyChangePct(quote);
  if (closes.length >= 2) {
    const first = closes[0]!;
    const last = closes[closes.length - 1]!;
    if (first > 0) return ((last - first) / first) * 100;
  }
  return dailyChangePct(quote);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Finnhub error ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchFinnhubQuote(
  symbol: string,
  period: StockTickerPerformancePeriod,
  apiKeyOverride?: string,
): Promise<StockQuoteSnapshot> {
  const key = resolveFinnhubApiKey(apiKeyOverride);
  if (!key) throw new Error('Finnhub API key not configured');

  const quote = await fetchJson<FinnhubQuote>(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
  );

  const price = quote.c ?? quote.pc ?? 0;
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error(`No quote data for ${symbol}`);
  }

  const range = periodRange(period);
  let closes: number[] = [];
  try {
    const candle = await fetchJson<FinnhubCandle>(
      `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${range.resolution}&from=${range.from}&to=${range.to}&token=${key}`,
    );
    if (candle.s === 'ok' && Array.isArray(candle.c) && candle.c.length > 0) {
      closes = candle.c.filter((v) => Number.isFinite(v) && v > 0);
    }
  } catch {
    closes = [];
  }

  const changePct = periodChangePct(period, quote, closes);
  const sparklineFromCandles = normalizeSparklineCloses(closes, period);
  const resolvedSparkline =
    sparklineFromCandles.length >= 2
      ? sparklineFromCandles
      : syntheticSparkline(hashStringSeed(`${symbol}:${period}`), period, changePct);

  return {
    symbol,
    price: Math.round(price * 100) / 100,
    changePct: Math.round(changePct * 100) / 100,
    sparkline: resolvedSparkline,
    fetchedAt: new Date().toISOString(),
  };
}
