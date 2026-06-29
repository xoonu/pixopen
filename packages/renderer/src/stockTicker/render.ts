import type { Frame, StockQuoteSnapshot, StockTickerConfig } from '@pixopen/core';
import { CANVAS_SIZE, hashStringSeed, stockTickerQuoteSymbols, syntheticSparkline } from '@pixopen/core';
import { rotateIndex, listPageCount, LIST_BLOCK_HEIGHT, LIST_TOP, LIST_SYMBOL_Y, LIST_METRICS_Y, LIST_RULE_Y, LIST_RULE_INSET, LIST_SYMBOLS_PER_PAGE } from './config.js';
import {
  drawText,
  drawHLine,
  fillRect,
  hexToRgb,
  setPx,
  textWidth,
} from './draw.js';
import { drawFlipNoteText } from './flipText.js';
import { changeColor, formatChangePct, formatPrice } from './format.js';
import { drawSparkline } from './sparkline.js';

function blankPixels(bg: [number, number, number]): number[] {
  const pixels = new Array(CANVAS_SIZE * CANVAS_SIZE * 4).fill(0);
  for (let y = 0; y < CANVAS_SIZE; y++) {
    for (let x = 0; x < CANVAS_SIZE; x++) {
      setPx(pixels, x, y, bg);
    }
  }
  return pixels;
}

function drawListBlock(
  pixels: number[],
  config: StockTickerConfig,
  quote: StockQuoteSnapshot,
  blockY: number,
  ruleColor: [number, number, number],
  drawRule: boolean,
) {
  const textColor = hexToRgb(config.colors.text);

  if (config.showSymbol) {
    drawFlipNoteText(pixels, 2, blockY + LIST_SYMBOL_Y, quote.symbol, textColor);
  }

  const metricsY = blockY + LIST_METRICS_Y;
  if (config.showPrice) {
    drawText(pixels, 2, metricsY, formatPrice(quote.price), textColor);
  }
  if (config.showChange) {
    const changeText = formatChangePct(quote.changePct);
    drawText(
      pixels,
      CANVAS_SIZE - 2 - textWidth(changeText),
      metricsY,
      changeText,
      changeColor(config, quote.changePct),
    );
  }

  if (drawRule) {
    drawHLine(
      pixels,
      LIST_RULE_INSET,
      blockY + LIST_RULE_Y,
      CANVAS_SIZE - LIST_RULE_INSET * 2,
      ruleColor,
    );
  }
}

function drawListMode(
  pixels: number[],
  config: StockTickerConfig,
  quotes: StockQuoteSnapshot[],
  elapsedMs: number,
) {
  const bg = hexToRgb(config.colors.background);
  fillRect(pixels, 0, 0, CANVAS_SIZE, CANVAS_SIZE, bg);
  if (quotes.length === 0) return;

  const pages = listPageCount(quotes.length, config);
  const page = rotateIndex(elapsedMs, pages, config.holdMs);
  const start = page * LIST_SYMBOLS_PER_PAGE;
  const ruleColor = hexToRgb(config.colors.flat);

  const pageQuotes = quotes.slice(start, start + LIST_SYMBOLS_PER_PAGE);

  for (const [index, quote] of pageQuotes.entries()) {
    const isLast = index === pageQuotes.length - 1;
    drawListBlock(
      pixels,
      config,
      quote,
      LIST_TOP + index * LIST_BLOCK_HEIGHT,
      ruleColor,
      !isLast,
    );
  }
}

function drawRotateMode(
  pixels: number[],
  config: StockTickerConfig,
  quotes: StockQuoteSnapshot[],
  elapsedMs: number,
) {
  const bg = hexToRgb(config.colors.background);
  fillRect(pixels, 0, 0, CANVAS_SIZE, CANVAS_SIZE, bg);
  if (quotes.length === 0) return;

  const q = quotes[rotateIndex(elapsedMs, quotes.length, config.holdMs)]!;
  const accent = changeColor(config, q.changePct);
  const textColor = hexToRgb(config.colors.text);

  const sparkH = 20;
  const sparkY = CANVAS_SIZE - sparkH - 2;
  let y = 2;

  if (config.showSymbol) {
    drawFlipNoteText(pixels, 2, y, q.symbol, textColor);
    y += 11;
  }
  if (config.showPrice) {
    drawText(pixels, 2, y, formatPrice(q.price), textColor);
    y += 8;
  }
  if (config.showChange) {
    drawText(pixels, 2, y, formatChangePct(q.changePct), accent);
  }

  if (config.showSparkline) {
    drawSparkline(pixels, 2, sparkY, 60, sparkH, q.sparkline, q.changePct, accent);
  }
}

function drawDashboardMode(
  pixels: number[],
  config: StockTickerConfig,
  quotes: StockQuoteSnapshot[],
  elapsedMs: number,
) {
  const bg = hexToRgb(config.colors.background);
  fillRect(pixels, 0, 0, CANVAS_SIZE, CANVAS_SIZE, bg);
  if (quotes.length === 0) return;

  const q = quotes[rotateIndex(elapsedMs, quotes.length, config.holdMs)]!;
  const accent = changeColor(config, q.changePct);
  const textColor = hexToRgb(config.colors.text);
  const headerBg = hexToRgb(config.colors.accent);
  fillRect(pixels, 0, 0, CANVAS_SIZE, 30, [
    Math.round(headerBg[0] * 0.25),
    Math.round(headerBg[1] * 0.25),
    Math.round(headerBg[2] * 0.25),
  ]);

  let headerX = 2;
  if (config.showSymbol) {
    drawFlipNoteText(pixels, headerX, 2, q.symbol, textColor);
  }

  const metricsY = config.showSymbol ? 14 : 2;
  let metricsX = 2;
  if (config.showPrice) {
    drawText(pixels, metricsX, metricsY, formatPrice(q.price), textColor);
    metricsX += textWidth(formatPrice(q.price)) + 4;
  }
  if (config.showChange) {
    drawText(pixels, metricsX, metricsY, formatChangePct(q.changePct), accent);
  }

  if (config.showSparkline) {
    drawSparkline(pixels, 2, 32, 60, 30, q.sparkline, q.changePct, accent);
  }
}

export function renderStockTickerBoard(
  config: StockTickerConfig,
  quotes: StockQuoteSnapshot[],
  elapsedMs: number,
): Frame {
  const pixels = blankPixels(hexToRgb(config.colors.background));
  if (config.displayMode === 'dashboard') {
    drawDashboardMode(pixels, config, quotes, elapsedMs);
  } else if (config.displayMode === 'list') {
    drawListMode(pixels, config, quotes, elapsedMs);
  } else {
    drawRotateMode(pixels, config, quotes, elapsedMs);
  }
  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
}

export function renderStockTickerPreview(
  config: StockTickerConfig,
  quotes: StockQuoteSnapshot[],
  elapsedMs: number,
): Frame {
  return renderStockTickerBoard(config, quotes, elapsedMs);
}

// demo quotes for client preview — mirrors server demo.ts
export function demoQuotesForConfig(config: StockTickerConfig): StockQuoteSnapshot[] {
  return stockTickerQuoteSymbols(config.symbols).map((symbol) => {
    const seed = hashStringSeed(`${symbol}:${config.performancePeriod}`);
    const base = 40 + (seed % 400) + seededRandom(seed + 1) * 120;
    const changePct = Math.round((seededRandom(seed + 2) - 0.48) * 8 * 100) / 100;
    return {
      symbol,
      price: Math.round(base * 100) / 100,
      changePct,
      sparkline: syntheticSparkline(seed, config.performancePeriod, changePct),
      fetchedAt: new Date().toISOString(),
    };
  });
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
