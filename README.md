# Pixopen

Browser-based studio and runtime for Divoom Pixoo-64 displays.

Pixopen runs as a **local companion server** that proxies device communication (Pixoo has no CORS), serves a web UI, and runs live prefab apps on your 64×64 display.

## Features (v0.1)

- Discover Pixoo-64 on your LAN (Divoom cloud) or add IP manually
- 64×64 pixel editor with full-color pencil, eraser, fill
- Import still images and animated GIFs (edit frame-by-frame)
- **Live Frames** — prefab live apps (Flip Note, Stock Ticker, Weather, DVD Screensaver, Spotify) pushed to Pixoo with **Run**
- Deploy frame animations to your Pixoo

## Live Frames

In **New project**, choose **Live Frames**:

- **Flip Note** — split-flap letter board with rotating messages
- **Stock Ticker** — watchlist with rotate, dashboard, and paginated list layouts (3 symbols per page)
- **Weather** — current conditions for a saved location (Open-Meteo, no API key)
- **DVD Screensaver** — classic bouncing DVD logo with speed, smoothness, and corner-hit tracking in the studio
- **Spotify** — full-bleed album art for what’s playing on your Spotify account (or your last played track)

**Start from scratch** is for Image Frame and Animator only.

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
- Internet for device discovery and live frame data (weather, market quotes, Spotify)

## Project structure

- `packages/core` — shared types
- `packages/device` — Pixoo client + discovery
- `packages/datasources` — data adapters for live frames
- `packages/renderer` — frame and live-frame renderers
- `packages/server` — API + runtime (`pixopen serve`)
- `packages/web` — React UI

## Weather (Open-Meteo, no API key)

The **Weather** live frame shows current conditions for a location you pick in the studio. Pixopen geocodes the place name and fetches forecast data from [Open-Meteo](https://open-meteo.com/) on a timer — no API key required.

Weather icons are from [Dhole/weather-pixel-icons](https://github.com/Dhole/weather-pixel-icons) (CC BY-SA 4.0).

## Stock Ticker (Finnhub API key)

The **Stock Ticker** live frame uses Finnhub’s REST API for US stock quotes. When you register at [finnhub.io](https://finnhub.io/register), copy the **API key** into the **Market data** field in the stock ticker sidebar. You do **not** need to configure Finnhub webhooks (URL or secret) — Pixopen fetches quotes on a timer.

The key is saved with the project. You can also set `FINNHUB_API_KEY` on the server as a fallback.

Without a key, the ticker shows demo quotes for layout work.

Display modes: **rotate** (one symbol at a time), **dashboard** (header + sparkline), **list** (paginated watchlist). Performance period (1D / 1W / 1M / YTD) controls change % and sparkline range.

## DVD Screensaver

The **DVD Screensaver** live frame streams the classic bouncing DVD Video logo on a black 64×64 canvas. Color shifts on each wall bounce; corner hits are tracked in the studio sidebar only (not on the device).

Studio controls:

- **Movement speed** — base travel speed in pixels per second
- **Smoothness** — slows motion and adds a short motion trail (up to 2 ghost frames) tuned for Pixoo’s ~2 fps update rate
- **Logo size** — 1× or 2×
- **Corner sensitivity** — how close a bounce must be to count as a corner hit

Use **Run on Pixoo** to stream live frames. Pixoo accepts updates at roughly **2 frames per second** (500 ms minimum between pushes); faster rates can reboot the device. While a live frame is running, Pixopen keeps macOS awake (`caffeinate`) and rotates the Pixoo connection every 20 minutes so long runs stay reliable.

## Spotify

The **Spotify** live frame shows full-bleed album artwork for the track currently playing on your account. When nothing is playing, it uses your most recently played album; if that isn’t available either, it shows the Spotify logo.

### Configure in the studio

1. Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. In the app **Settings → Redirect URIs**, add exactly this (use `127.0.0.1`, not `localhost`):

```
http://127.0.0.1:3847/callback
```

   Click **Save** in the Spotify dashboard after adding it.
3. Open a **Spotify** project in Pixopen.
4. Paste **Client ID** and **Client secret**, then click **Connect with Spotify**.
5. Approve access in the browser — Pixopen saves the token automatically.

Credentials are stored on this machine under `data/` (gitignored), not inside the project.

You can still set `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REFRESH_TOKEN` as env vars; studio values take priority when present.
