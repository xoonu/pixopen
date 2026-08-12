# Pixopen

Browser-based studio and runtime for Divoom Pixoo-64 displays.

Pixopen runs as a **local companion server** that proxies device communication (Pixoo has no CORS), serves a web UI, stores projects under `data/`, and streams **Live Frames** to your 64×64 display.

## Features

- Discover Pixoo-64 on your LAN (Divoom cloud) or add an IP manually
- **Live Frames** — prefab live apps pushed to Pixoo with **Run on Pixoo**
- **Image Frame** and **Animator** — stills, slideshows, pixel drawing, GIF/video import, then **Deploy**
- In-studio preview plus live WebSocket preview while a project is running
- Local secrets and caches under `data/` (gitignored)

## Live Frames

In **New project**, choose **Live Frames**:

| Frame | What it does |
|-------|----------------|
| **Flip Note** | Split-flap letter board with rotating messages (1–3 lines). Font: Pixel or soft Figtree Bold. |
| **Weather** | Current conditions from [Open-Meteo](https://open-meteo.com/) (no API key). Cycle up to **8** locations with a hold timer; °F/°C and color themes. |
| **Stock Ticker** | Finnhub watchlist with rotate, dashboard, and paginated list layouts, plus sparklines and period (1D / 1W / 1M / YTD). |
| **DVD Screensaver** | Classic bouncing DVD logo with speed, trail smoothness, size, and corner-hit tracking in the studio. |
| **Spotify** | Full-bleed artwork for what’s playing (or last played). OAuth from the studio. |
| **On Air** | Retro status plaque — ON AIR, in a meeting, recording, or do not disturb (optional pulse). |
| **AI Muse** | Cycling SFW AI portraits (Civitai + local library); optional **Nano Banana** generate via Gemini. |
| **Instagram Feed** | Cycle recent static photos from public Instagram usernames you choose. |

**Start from scratch** is for **Image Frame** and **Animator** only.

### Run vs Deploy

- **Run on Pixoo** — Live Frames only. Streams frames continuously (~2 fps / 500 ms minimum between pushes). Stops any previous live stream first.
- **Deploy** — Image Frame / Animator. Pushes a still or animation GIF once.

While a live frame is running, Pixopen keeps macOS awake (`caffeinate`) and rotates the Pixoo connection periodically so long runs stay reliable.

## Quick start

```bash
npm install
npm run dev
```

Open **http://localhost:5173** (Vite UI). The API listens on **http://localhost:3847**.

Production-style single process (builds everything, serves the UI from the API):

```bash
npm run serve
```

Then open **http://localhost:3847**.

## Requirements

- Node.js 20+
- Pixoo-64 on the same network as the machine running Pixopen
- Internet for device discovery and live data (weather, quotes, Spotify, AI Muse, Instagram, etc.)

## Project structure

- `packages/core` — shared types, templates, and config normalize/parsers
- `packages/device` — Pixoo client + discovery
- `packages/datasources` — adapters for blank live-region widgets
- `packages/renderer` — 64×64 compositors, fonts, and sprite generators
- `packages/server` — API + live runtime (`pixopen`)
- `packages/web` — React studio UI

## Flip Note

Customize rotating messages, line count, alignment, background (solid or gradient), and hold timing. Choose **Pixel** or **Figtree** for the letter style. Messages change on a hard cut (no flap animation).

## Weather (Open-Meteo, no API key)

Add one or more places in the studio (up to eight). Pixopen geocodes each name, fetches current conditions from Open-Meteo, and cycles locations using the **hold** interval. Units and color themes are per project.

Weather glyphs are soft-baked from [Erik Flowers Weather Icons](https://github.com/erikflowers/weather-icons). Temperature digits use Figtree Bold at native board size.

## Stock Ticker (Finnhub API key)

Uses Finnhub’s REST API for US stock quotes. Register at [finnhub.io](https://finnhub.io/register), then paste the **API key** into **Market data** in the stock ticker sidebar. You do **not** need Finnhub webhooks — Pixopen polls on a timer.

The key is saved with the project. You can also set `FINNHUB_API_KEY` on the server as a fallback. Without a key, the ticker shows demo quotes for layout work.

Display modes: **rotate**, **dashboard**, **list**. Performance period controls change % and sparkline range.

## DVD Screensaver

Streams the bouncing DVD Video logo on a black 64×64 canvas. Color shifts on each wall bounce; corner hits are counted in the studio sidebar only (not on the device).

Studio controls:

- **Movement speed** — base travel speed in pixels per second
- **Smoothness** — slows motion and adds a short trail (up to 2 ghost frames) tuned for Pixoo’s ~2 fps rate
- **Logo size** — 1× or 2×
- **Corner sensitivity** — how close a bounce must be to count as a corner hit

## Spotify

Shows full-bleed artwork for the track or podcast episode currently playing (preferring Spotify’s ~64×64 cover when available). When nothing is playing, it uses your most recently played item; otherwise the Spotify logo.

### Configure in the studio

1. Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. In **Settings → Redirect URIs**, add exactly (use `127.0.0.1`, not `localhost`):

```
http://127.0.0.1:3847/callback
```

   Click **Save** in the Spotify dashboard after adding it.
3. Open a **Spotify** project in Pixopen.
4. Paste **Client ID** and **Client secret**, then click **Connect with Spotify**.
5. Approve access in the browser — Pixopen saves the token automatically.

Credentials live under `data/` (gitignored), not inside the project.

You can still set `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REFRESH_TOKEN` as env vars; studio values take priority when present.

## On Air

Pick a status plaque (**ON AIR**, in a meeting, recording, or do not disturb) and optional pulse. Designed as a full-bleed retro sign for desks and studios — use **Run on Pixoo** to keep it live.

## AI Muse

Cycles square SFW AI portraits matched to look preferences. The live feed can pull from Civitai and a local library under `data/`.

Optional **Nano Banana** generation uses a [Google AI Studio](https://aistudio.google.com/apikey) Gemini API key (studio UI or `GEMINI_API_KEY`). Generated images are saved to your local library and use your Gemini quota.

## Instagram Feed

Add public Instagram usernames (up to 10). Pixopen fetches recent static posts and cycles them on the board. Configure refresh / re-fetch intervals and an optional block list in the studio. Media caches under `data/`.
