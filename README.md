# Pixopen

Browser-based studio and runtime for Divoom Pixoo-64 displays.

Pixopen runs as a **local companion server** that proxies device communication (Pixoo has no CORS), serves a web UI, and runs live data apps that composite dynamic regions onto your 64×64 pixel art.

## Features (v0.1)

- Discover Pixoo-64 on your LAN (Divoom cloud) or add IP manually
- 64×64 pixel editor with full-color pencil, eraser, fill
- Import still images and animated GIFs (edit frame-by-frame)
- Live Areas: bind rectangular regions to data sources (clock, weather, stocks, sports, ISS)
- Deploy animations or run live projects on your Pixoo

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
