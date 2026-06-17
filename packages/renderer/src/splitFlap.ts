import {
  CANVAS_SIZE,
  DEFAULT_VESTA_NOTE_CONFIG,
  normalizeVestaAppConfig,
  type Frame,
  type VestaNoteConfig,
} from '@pixopen/core';

const FLAP_FONT: Record<string, number[][]> = {
  '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
  '3': [[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]],
  '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
  '7': [[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
  '8': [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
  '9': [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
  'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'B': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
  'C': [[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],
  'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
  'E': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
  'F': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
  'G': [[0,1,1],[1,0,0],[1,0,1],[1,0,1],[0,1,1]],
  'H': [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  'J': [[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
  'K': [[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
  'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  'M': [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
  'N': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
  'O': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  'P': [[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
  'Q': [[0,1,0],[1,0,1],[1,0,1],[1,1,1],[0,1,1]],
  'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
  'S': [[0,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0]],
  'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
  'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  'V': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  'W': [[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1]],
  'X': [[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
  'Y': [[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
  'Z': [[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
  '!': [[0,1,0],[0,1,0],[0,1,0],[0,0,0],[0,1,0]],
  '?': [[0,1,0],[1,0,1],[0,0,1],[0,1,0],[0,1,0]],
  '.': [[0],[0],[0],[0],[1]],
  ',': [[0],[0],[0],[0,1],[1,0]],
  '-': [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
  "'": [[0,1,0],[0,1,0],[0,1,0],[0,0,0],[0,0,0]],
  ' ': [[0],[0],[0],[0],[0]],
};

const COLS = 8;
const CELL_W = 7;

function setPx(pixels: number[], x: number, y: number, r: number, g: number, b: number) {
  if (x < 0 || y < 0 || x >= CANVAS_SIZE || y >= CANVAS_SIZE) return;
  const i = (y * CANVAS_SIZE + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = 255;
}

function fillRect(
  pixels: number[],
  x: number,
  y: number,
  w: number,
  h: number,
  color: [number, number, number],
) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      setPx(pixels, px, py, color[0], color[1], color[2]);
    }
  }
}

function drawGlyphClipped(
  pixels: number[],
  x: number,
  y: number,
  ch: string,
  color: [number, number, number],
  clipTop: number,
  clipBottom: number,
) {
  const glyph = FLAP_FONT[ch.toUpperCase()] ?? FLAP_FONT[' '];
  for (let gy = 0; gy < glyph.length; gy++) {
    for (let gx = 0; gx < glyph[gy].length; gx++) {
      if (!glyph[gy][gx]) continue;
      const py = y + gy;
      if (py < clipTop || py >= clipBottom) continue;
      setPx(pixels, x + gx, py, color[0], color[1], color[2]);
    }
  }
}

function padMessage(msg: string, cols: number): string {
  const upper = msg.toUpperCase().slice(0, cols);
  return upper.padEnd(cols, ' ');
}

function boardLayout(boardLines: 1 | 2 | 3) {
  const gap = 1;
  const cellH = boardLines === 1 ? 9 : boardLines === 2 ? 8 : 6;
  const totalH = boardLines * cellH + (boardLines - 1) * gap;
  const boardY = Math.floor((CANVAS_SIZE - totalH) / 2);
  const boardX = Math.floor((CANVAS_SIZE - COLS * CELL_W) / 2);
  return { cellH, gap, boardX, boardY };
}

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '').slice(0, 6);
  if (v.length !== 6) return [244, 228, 188];
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function resolveLetterColor(config: VestaNoteConfig): [number, number, number] {
  if (config.letterColorMode === 'monochrome') return [255, 255, 255];
  if (config.letterColorMode === 'custom') return hexToRgb(config.letterColor);
  return [244, 228, 188];
}

function resolveFlapColors(config: VestaNoteConfig): {
  flapBg: [number, number, number];
  flapLine: [number, number, number];
  hingeColor: [number, number, number];
} {
  if (config.letterColorMode === 'monochrome') {
    return {
      flapBg: [48, 48, 48],
      flapLine: [24, 24, 24],
      hingeColor: [120, 120, 120],
    };
  }
  return {
    flapBg: [32, 34, 44],
    flapLine: [12, 13, 18],
    hingeColor: [80, 72, 58],
  };
}

function chunkMessages(messages: string[], boardLines: number): string[][] {
  const source = messages.length > 0 ? messages : [...DEFAULT_VESTA_NOTE_CONFIG.messages];
  const frames: string[][] = [];
  for (let i = 0; i < source.length; i += boardLines) {
    const frame: string[] = [];
    for (let row = 0; row < boardLines; row++) {
      frame.push(padMessage(source[i + row] ?? '', COLS));
    }
    frames.push(frame);
  }
  return frames.length > 0 ? frames : [[padMessage('PIXOPEN', COLS)]];
}

function messageTiming(config: VestaNoteConfig, elapsedMs: number) {
  const boardLines = config.boardLines ?? 1;
  const frames = chunkMessages(config.messages, boardLines);

  const holdMs = Math.max(500, config.holdMs);
  const flipMs = Math.max(100, config.flipMs);
  const cycleMs = frames.length * (holdMs + flipMs);
  const t = elapsedMs % cycleMs;

  let acc = 0;
  for (let i = 0; i < frames.length; i++) {
    const holdEnd = acc + holdMs;
    const flipEnd = holdEnd + flipMs;
    if (t < flipEnd) {
      const prev = frames[(i - 1 + frames.length) % frames.length];
      const next = frames[i];
      if (t < holdEnd) {
        return { current: next, previous: next, flipProgress: 0 };
      }
      return {
        current: next,
        previous: prev,
        flipProgress: (t - holdEnd) / flipMs,
      };
    }
    acc = flipEnd;
  }
  return { current: frames[0], previous: frames[0], flipProgress: 0 };
}

export function parseVestaNoteConfig(raw: Record<string, unknown> | undefined): VestaNoteConfig {
  return normalizeVestaAppConfig(raw);
}

export function renderVestaNoteBoard(
  base: Frame,
  config: VestaNoteConfig,
  elapsedMs: number,
): Frame {
  const pixels = [...base.pixels];
  const cfg = parseVestaNoteConfig(config as unknown as Record<string, unknown>);
  const { current, previous, flipProgress } = messageTiming(cfg, elapsedMs);
  const boardLines = cfg.boardLines ?? 1;
  const { cellH, gap, boardX, boardY } = boardLayout(boardLines);
  const textColor = resolveLetterColor(cfg);
  const { flapBg, flapLine, hingeColor } = resolveFlapColors(cfg);

  for (let row = 0; row < boardLines; row++) {
    const cy = boardY + row * (cellH + gap);
    for (let col = 0; col < COLS; col++) {
      const cx = boardX + col * CELL_W;
      fillRect(pixels, cx, cy, CELL_W - 1, cellH, flapBg);
      const midY = cy + Math.floor(cellH / 2);

      const fromCh = previous[row]?.[col] ?? ' ';
      const toCh = current[row]?.[col] ?? ' ';
      const flipping = flipProgress > 0 && fromCh !== toCh;

      if (!flipping) {
        drawGlyphClipped(pixels, cx + 1, cy + 1, toCh, textColor, cy, cy + cellH);
      } else {
        const split = Math.floor(flipProgress * cellH);
        drawGlyphClipped(pixels, cx + 1, cy + 1, fromCh, textColor, cy, midY);
        drawGlyphClipped(pixels, cx + 1, cy + 1, toCh, textColor, midY, cy + cellH);
        if (split > 0) {
          fillRect(pixels, cx, cy + split, CELL_W - 1, 1, hingeColor);
        }
      }

      setPx(pixels, cx, midY, flapLine[0], flapLine[1], flapLine[2]);
      setPx(pixels, cx + CELL_W - 2, midY, flapLine[0], flapLine[1], flapLine[2]);
    }
  }

  return { width: CANVAS_SIZE, height: CANVAS_SIZE, pixels };
}

export function renderVestaNotePreview(config: VestaNoteConfig, tickMs: number): Frame {
  const base = {
    width: CANVAS_SIZE as 64,
    height: CANVAS_SIZE as 64,
    pixels: new Array(CANVAS_SIZE * CANVAS_SIZE * 4).fill(0),
  };
  for (let i = 0; i < base.pixels.length; i += 4) {
    base.pixels[i] = 18;
    base.pixels[i + 1] = 20;
    base.pixels[i + 2] = 28;
    base.pixels[i + 3] = 255;
  }
  return renderVestaNoteBoard(base, config, tickMs);
}
