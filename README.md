# Pixopen

Browser-based studio and runtime for Divoom Pixoo-64 displays.

Pixopen runs as a **local companion server** that proxies device communication (Pixoo has no CORS), serves a web UI, and runs live data apps that composite dynamic regions onto your 64×64 pixel art.

## Features (v0.1)

- Discover Pixoo-64 on your LAN (Divoom cloud) or add IP manually
- 64×64 pixel editor with full-color pencil, eraser, fill
- Import still images and animated GIFs (edit frame-by-frame)
- **Live Frames** — prefab live apps (Flip Note, Stock Ticker) pushed to Pixoo with **Run**
- Deploy frame animations to your Pixoo

## Live Frames

In **New project**, choose **Live Frames**:

- **Flip Note** — split-flap letter board with rotating messages
- **Stock Ticker** — watchlist with rotate, dashboard, and paginated list layouts (3 symbols per page)

**Start from scratch** is for Image Frame and Animator only. The old blank live-frame builder (custom live regions on a canvas) is removed.

Legacy projects that used live regions still open for viewing; create new live work from the templates above.

## Quick start

```bash
npm install
npm run build
npm run serve
```

In a second terminal:

```bash
npm run dev -w @pixopen/web
```

Open http://localhost:5173

## Requirements

- Node.js 20+
- Pixoo-64 on the same network as the machine running Pixopen
- Internet for device discovery and live data sources

## Project structure

- `packages/core` — shared types
- `packages/device` — Pixoo client + discovery
- `packages/datasources` — open data stream adapters
- `packages/renderer` — live area compositor
- `packages/server` — API + runtime (`pixopen serve`)
- `packages/web` — React UI

## Data sources (no API key)

- `local.clock` — server time
- `open-meteo.current` — weather
- `terminalfeed.stocks` — US stock movers
- `sportscore.live` — live sports scores
- `open-notify.iss` — ISS position

## Stock Ticker (Finnhub API key)

The **Stock Ticker** live frame uses Finnhub’s REST API for US stock quotes. When you register at [finnhub.io](https://finnhub.io/register), copy the **API key** into the **Market data** field in the stock ticker sidebar. You do **not** need to configure Finnhub webhooks (URL or secret) — Pixopen fetches quotes on a timer.

The key is saved with the project. You can also set `FINNHUB_API_KEY` on the server as a fallback.

Without a key, the ticker shows demo quotes for layout work.

Display modes: **rotate** (one symbol at a time), **dashboard** (header + sparkline), **list** (paginated watchlist). Performance period (1D / 1W / 1M / YTD) controls change % and sparkline range.
