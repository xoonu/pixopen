import { useEffect, useRef, useState } from 'react';
import { CANVAS_SIZE, stockTickerQuoteSymbols, type StockQuoteSnapshot } from '@pixopen/core';
import {
  demoQuotesForConfig,
  parseStockTickerConfig,
  renderStockTickerPreview,
} from '@pixopen/renderer';
import { api } from '../lib/api';

type Props = {
  appConfig?: Record<string, unknown>;
  scale?: number;
  playing?: boolean;
  className?: string;
};

function putFramePixels(ctx: CanvasRenderingContext2D, pixels: number[]) {
  const data = new Uint8ClampedArray(pixels);
  try {
    ctx.putImageData(new ImageData(data, CANVAS_SIZE, CANVAS_SIZE), 0, 0);
  } catch {
    const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    imageData.data.set(data);
    ctx.putImageData(imageData, 0, 0);
  }
}

export function StockTickerPreview({ appConfig = {}, scale = 6, playing = true, className = '' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const configRef = useRef(appConfig);
  const playingRef = useRef(playing);
  const quotesRef = useRef<StockQuoteSnapshot[]>(demoQuotesForConfig(parseStockTickerConfig(appConfig)));
  const [dataHint, setDataHint] = useState('Loading quotes…');

  configRef.current = appConfig;
  playingRef.current = playing;

  useEffect(() => {
    const config = parseStockTickerConfig(configRef.current);
    const symbols = stockTickerQuoteSymbols(config.symbols);
    if (symbols.length === 0) {
      quotesRef.current = [];
      return;
    }

    let cancelled = false;
    const load = () => {
      const finnhubApiKey = parseStockTickerConfig(configRef.current).finnhubApiKey;
      void api.market
        .quotes(symbols, config.performancePeriod, finnhubApiKey)
        .then((res) => {
          if (cancelled) return;
          quotesRef.current = res.quotes;
          if (res.provider === 'finnhub' && res.errors.length === 0) {
            setDataHint('Live quotes via Finnhub');
          } else if (res.provider === 'finnhub') {
            setDataHint(`Partial live data — ${res.errors[0] ?? 'some symbols failed'}`);
          } else if (res.configured) {
            setDataHint(`Finnhub failed — ${res.errors[0] ?? 'check API key and symbols'}`);
          } else {
            setDataHint('Demo quotes — add your Finnhub API key in the sidebar (webhooks not required)');
          }
        })
        .catch((err) => {
          if (cancelled) return;
          quotesRef.current = demoQuotesForConfig(config);
          setDataHint(err instanceof Error ? err.message : 'Could not load quotes');
        });
    };

    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    appConfig.symbols,
    appConfig.performancePeriod,
    appConfig.finnhubApiKey,
    appConfig.displayMode,
    appConfig.showSparkline,
    appConfig.showSymbol,
    appConfig.showPrice,
    appConfig.showChange,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const start = Date.now();
    let raf = 0;

    const draw = () => {
      const config = parseStockTickerConfig(configRef.current);
      const quotes =
        quotesRef.current.length > 0 ? quotesRef.current : demoQuotesForConfig(config);
      const elapsed = playingRef.current ? Date.now() - start : 0;
      const frame = renderStockTickerPreview(config, quotes, elapsed);
      putFramePixels(ctx, frame.pixels);
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="stock-ticker-preview-wrap">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className={`stock-ticker-preview-canvas ${className}`.trim()}
        style={{ width: CANVAS_SIZE * scale, height: CANVAS_SIZE * scale }}
        aria-label="Stock ticker preview"
      />
      <p className="muted stock-ticker-data-hint">{dataHint}</p>
    </div>
  );
}
