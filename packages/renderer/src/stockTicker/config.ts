import type { StockTickerConfig } from '@pixopen/core';

export { normalizeStockTickerAppConfig as parseStockTickerConfig } from '@pixopen/core';

export const LIST_SYMBOLS_PER_PAGE = 3;

/** Flip Note symbol row + compact metrics row. */
export const LIST_SYMBOL_Y = 0;
export const LIST_METRICS_Y = 9;
export const LIST_METRICS_HEIGHT = 5;

/** Equal padding above and below each divider (px). */
export const LIST_RULE_GAP = 3;
export const LIST_RULE_Y = LIST_METRICS_Y + LIST_METRICS_HEIGHT + LIST_RULE_GAP;
export const LIST_RULE_INSET = 2;

/** Block stride: content, gap, rule, gap — repeated for each listing. */
export const LIST_BLOCK_HEIGHT = LIST_RULE_Y + 1 + LIST_RULE_GAP;
export const LIST_TOP = 2;

export function rotateIndex(elapsedMs: number, count: number, holdMs: number): number {
  if (count <= 0) return 0;
  return Math.floor(elapsedMs / Math.max(1, holdMs)) % count;
}

export function listSymbolsPerPage(_config?: StockTickerConfig): number {
  return LIST_SYMBOLS_PER_PAGE;
}

export function listPageCount(quoteCount: number, _config?: StockTickerConfig): number {
  if (quoteCount <= 0) return 1;
  return Math.ceil(quoteCount / LIST_SYMBOLS_PER_PAGE);
}
