# Quicksand (On Air)

On Air rasterizes **Quicksand Bold** into soft 64×64 text layers for the Pixoo display.

- Font: [Quicksand on Google Fonts](https://fonts.google.com/specimen/Quicksand)
- Files:
  - `Quicksand-Bold.woff` — static Bold used by the generator (`@fontsource/quicksand` 700)
  - `Quicksand.ttf` — variable source (kept for reference; canvas ignores `wght`)
- License: [SIL Open Font License 1.1](OFL.txt)

Regenerate text layers after changing layout or font:

```bash
npm run generate:on-air -w @pixopen/renderer
```
