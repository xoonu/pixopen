import type { StockQuoteSnapshot, StockTickerPerformancePeriod } from '@pixopen/core';
import { demoQuote } from './demo.js';
import { fetchFinnhubQuote, finnhubConfigured } from './finnhub.js';

const QUOTE_TTL_MS = 30_000;
const CANDLE_TTL_MS = 15 * 60_000;

type CacheEntry = {
  quote: StockQuoteSnapshot;
  quoteAt: number;
  live: boolean;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(
  symbol: string,
  period: StockTickerPerformancePeriod,
  finnhubApiKey?: string,
): string {
  const keyScope = finnhubApiKey?.trim() || 'env';
  return `${symbol}:${period}:${keyScope}`;
}

export function marketDataStatus(finnhubApiKey?: string): { provider: 'finnhub' | 'demo'; configured: boolean } {
  const configured = finnhubConfigured(finnhubApiKey);
  return { provider: configured ? 'finnhub' : 'demo', configured };
}

export type StockQuotesResult = {
  quotes: StockQuoteSnapshot[];
  provider: 'finnhub' | 'demo';
  configured: boolean;
  errors: string[];
};

async function loadQuote(
  symbol: string,
  period: StockTickerPerformancePeriod,
  finnhubApiKey?: string,
): Promise<{ quote: StockQuoteSnapshot; live: boolean }> {
  const key = cacheKey(symbol, period, finnhubApiKey);
  const cached = cache.get(key);
  const now = Date.now();
  const ttl = period === '1d' ? QUOTE_TTL_MS : CANDLE_TTL_MS;
  if (cached && now - cached.quoteAt < ttl) {
    return { quote: cached.quote, live: cached.live };
  }

  if (finnhubConfigured(finnhubApiKey)) {
    const quote = await fetchFinnhubQuote(symbol, period, finnhubApiKey);
    cache.set(key, { quote, quoteAt: now, live: true });
    return { quote, live: true };
  }

  const quote = demoQuote(symbol, period);
  cache.set(key, { quote, quoteAt: now, live: false });
  return { quote, live: false };
}

export async function fetchStockQuote(
  symbol: string,
  period: StockTickerPerformancePeriod,
  finnhubApiKey?: string,
): Promise<StockQuoteSnapshot> {
  const { quote } = await loadQuote(symbol, period, finnhubApiKey);
  return quote;
}

export async function fetchStockQuotes(
  symbols: string[],
  period: StockTickerPerformancePeriod,
  finnhubApiKey?: string,
): Promise<StockQuotesResult> {
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))];
  const configured = finnhubConfigured(finnhubApiKey);
  const errors: string[] = [];
  const quotes: StockQuoteSnapshot[] = [];
  let liveCount = 0;

  for (const symbol of unique) {
    try {
      const { quote, live } = await loadQuote(symbol, period, finnhubApiKey);
      quotes.push(quote);
      if (live) liveCount += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${symbol}: ${message}`);
      quotes.push(demoQuote(symbol, period));
    }
  }

  return {
    quotes,
    provider: configured && liveCount > 0 ? 'finnhub' : 'demo',
    configured,
    errors,
  };
}
