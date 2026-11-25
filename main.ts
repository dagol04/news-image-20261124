// news-image-20261124 — "The World in One Picture" (rebuild)
// A newspaper front page for Tuesday 24 November 2026, drawn from scratch
// in this session with a small rasterizer, a hand-built 5x7 bitmap font
// (stored as 5-bit row masks) and a hand-rolled PNG encoder.
// Node 22, standard library only. No network, no clocks, no randomness:
// the same run always writes the same bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The day's news — every story below was checked against reporting dated
// Tuesday 24 November 2026 (see README for sources):
//   LEAD   Russian overnight strike on Zaporizhzhia: 2 killed, 44 wounded,
//          among them 4 children; Kyiv defends its Libya warship strike
//   INDONESIA  Cikande candy-factory fire: 26 confirmed dead on Tuesday,
//          8 still missing; police open a criminal negligence inquiry
//          (the fire itself broke out on Saturday 21 Nov)
//   NEPAL  Magnitude 5.6 quake hits Taplejung at 07:17 local; no casualties
//   BUSINESS  Sanofi agrees to buy US drugmaker Insmed for $41bn in cash,
//          the year's biggest pharma deal, announced on Tuesday
//   MARKETS  Wall Street rebounds, led by Nvidia, after last week's slide
//   CLIMATE  COP31 RECAP — the Antalya talks collapsed on Sunday 22 Nov
//          with no fossil-fuel deal; two days on, nations trade blame
//   ALSO   US states sue Musk's firms over Grok images; the US loses its
//          measles-elimination status; Super Bowl 61 heads to IMAX
//
// Date discipline: nothing that happened on an earlier day is presented as
// 24 November news. The COP31 panel is labelled with its real date,
// 22 November, and the factory-fire panel says plainly that the fire
// broke out on 21 November and that Tuesday's news is the confirmed toll.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font. One glyph = 7 rows; each row is a 5-bit mask, bit 4 (16)
// is the leftmost cell, bit 0 (1) the rightmost. A set bit is ink.
// Glyphs below were drawn for this entry by hand, row by row.
// ---------------------------------------------------------------------------

type Glyph = [number, number, number, number, number, number, number];

const FONT: Record<string, Glyph> = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01111, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b01111],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01111, 0b10000, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  a: [0b00000, 0b00000, 0b01110, 0b00001, 0b01111, 0b10001, 0b01111],
  b: [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b11110],
  c: [0b00000, 0b00000, 0b01110, 0b10000, 0b10000, 0b10000, 0b01110],
  d: [0b00001, 0b00001, 0b01101, 0b10001, 0b10001, 0b10001, 0b01111],
  e: [0b00000, 0b00000, 0b01110, 0b10001, 0b11111, 0b10000, 0b01110],
  f: [0b00110, 0b01000, 0b01000, 0b11110, 0b01000, 0b01000, 0b01000],
  g: [0b00000, 0b01111, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  h: [0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  i: [0b00000, 0b00100, 0b00000, 0b01100, 0b00100, 0b00100, 0b01110],
  j: [0b00010, 0b00000, 0b00110, 0b00010, 0b00010, 0b10010, 0b01100],
  k: [0b10000, 0b10000, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010],
  l: [0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  m: [0b00000, 0b00000, 0b11010, 0b10101, 0b10101, 0b10101, 0b10101],
  n: [0b00000, 0b00000, 0b11110, 0b10001, 0b10001, 0b10001, 0b10001],
  o: [0b00000, 0b00000, 0b01110, 0b10001, 0b10001, 0b10001, 0b01110],
  p: [0b00000, 0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000],
  q: [0b00000, 0b01101, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001],
  r: [0b00000, 0b00000, 0b10110, 0b11001, 0b10000, 0b10000, 0b10000],
  s: [0b00000, 0b00000, 0b01111, 0b10000, 0b01110, 0b00001, 0b11110],
  t: [0b01000, 0b01000, 0b11110, 0b01000, 0b01000, 0b01000, 0b00110],
  u: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b10011, 0b01101],
  v: [0b00000, 0b00000, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
  w: [0b00000, 0b00000, 0b10001, 0b10101, 0b10101, 0b10101, 0b01010],
  x: [0b00000, 0b00000, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001],
  y: [0b00000, 0b10001, 0b10001, 0b10001, 0b01111, 0b00001, 0b01110],
  z: [0b00000, 0b00000, 0b11111, 0b00010, 0b00100, 0b01000, 0b11111],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0b01000, 0b11111],
  '3': [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00010, 0b00100, 0b00100, 0b00100],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0b01100, 0b01100],
  ',': [0, 0, 0, 0, 0b01100, 0b01100, 0b01000],
  ':': [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0],
  ';': [0, 0b01100, 0b01100, 0, 0b01100, 0b01100, 0b01000],
  '!': [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0, 0b00100],
  '?': [0b01110, 0b10001, 0b00001, 0b00010, 0b00100, 0, 0b00100],
  '-': [0, 0, 0, 0b11111, 0, 0, 0],
  "'": [0b00100, 0b00100, 0b01000, 0, 0, 0, 0],
  '"': [0b01010, 0b01010, 0, 0, 0, 0, 0],
  '/': [0b00001, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b10000],
  '(': [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ')': [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  '&': [0b01100, 0b10010, 0b10010, 0b01000, 0b10101, 0b10010, 0b01101],
  '%': [0b10001, 0b10010, 0b00010, 0b00100, 0b01000, 0b10010, 0b10001],
  '+': [0, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0],
  '=': [0, 0, 0b11111, 0, 0b11111, 0, 0],
  $: [0b00100, 0b01111, 0b10101, 0b01110, 0b10100, 0b11110, 0b00100],
  '\u2022': [0, 0, 0b00100, 0b01110, 0b01110, 0b00100, 0],
};

// ---------------------------------------------------------------------------
// Raster canvas: a plain RGB buffer with drawing primitives.
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array; // RGB, row-major
  private clipBox: { x: number; y: number; w: number; h: number } | null = null;

  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 3);
    this.rect(0, 0, w, h, bg);
  }

  put(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const cb = this.clipBox;
    if (cb && (x < cb.x || y < cb.y || x >= cb.x + cb.w || y >= cb.y + cb.h)) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.ceil(x + w));
    const y1 = Math.min(this.h, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.put(xx, yy, c);
    }
  }

  // Filled circle.
  disc(cx: number, cy: number, r: number, c: RGB): void {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.put(x, y, c);
      }
    }
  }

  // Circle outline, two pixels thick.
  ring(cx: number, cy: number, r: number, c: RGB): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      this.put(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
      this.put(Math.round(cx + (r - 1) * Math.cos(rad)), Math.round(cy + (r - 1) * Math.sin(rad)), c);
    }
  }

  // Bresenham line.
  line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
    let dx = Math.abs(x1 - x0);
    let dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let x = x0;
    let y = y0;
    for (;;) {
      this.put(x, y, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  // Line drawn t pixels wide by repeating it with small offsets.
  fatLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
    const half = Math.floor(t / 2);
    for (let i = -half; i <= half; i++) {
      this.line(x0 + i, y0, x1 + i, y1, c);
      this.line(x0, y0 + i, x1, y1 + i, c);
    }
  }

  // Filled triangle via barycentric test.
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
    const minX = Math.floor(Math.min(x0, x1, x2));
    const maxX = Math.ceil(Math.max(x0, x1, x2));
    const minY = Math.floor(Math.min(y0, y1, y2));
    const maxY = Math.ceil(Math.max(y0, y1, y2));
    const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
        const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
        const cc = 1 - a - b;
        if (a >= 0 && b >= 0 && cc >= 0) this.put(x, y, c);
      }
    }
  }

  // Run fn with drawing clipped to a box, so a picture can never spill
  // onto the text around it.
  clipped(x: number, y: number, w: number, h: number, fn: () => void): void {
    const prev = this.clipBox;
    this.clipBox = { x, y, w, h };
    fn();
    this.clipBox = prev;
  }
}

// ---------------------------------------------------------------------------
// Text: measure, wrap and draw with the bitmap font.
// ---------------------------------------------------------------------------

const CELL_W = 6; // 5 cells + 1 spacing, in font units
const CELL_H = 7;

function textWidth(text: string, scale: number): number {
  return text.length * CELL_W * scale - scale; // no trailing space
}

function drawGlyph(cv: Canvas, ch: string, x: number, y: number, scale: number, c: RGB): void {
  const glyph = FONT[ch] ?? FONT['?'];
  for (let row = 0; row < 7; row++) {
    const mask = glyph[row];
    for (let col = 0; col < 5; col++) {
      // Bit 4 is the leftmost cell.
      if (mask & (16 >> col)) {
        cv.rect(x + col * scale, y + row * scale, scale, scale, c);
      }
    }
  }
}

function drawText(cv: Canvas, text: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of text) {
    drawGlyph(cv, ch, cx, y, scale, c);
    cx += CELL_W * scale;
  }
}

function drawTextCentred(cv: Canvas, text: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(cv, text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c);
}

// Word-wrap plain text to a pixel width. Returns the lines.
function wrapText(text: string, scale: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur === '' ? w : cur + ' ' + w;
    if (textWidth(trial, scale) <= maxWidth || cur === '') {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// Draw wrapped text; returns the y just below the last line.
function drawPara(cv: Canvas, text: string, x: number, y: number, scale: number, maxWidth: number, c: RGB, leading = 1.5): number {
  const lines = wrapText(text, scale, maxWidth);
  const lh = Math.round(CELL_H * scale * leading);
  for (const ln of lines) {
    drawText(cv, ln, x, y, scale, c);
    y += lh;
  }
  return y;
}

// ---------------------------------------------------------------------------
// PNG encoding (truecolour, no ancillary chunks, no timestamps: deterministic).
// ---------------------------------------------------------------------------

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG(cv: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(cv.w, 0);
  ihdr.writeUInt32BE(cv.h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type 2 = RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc((cv.w * 3 + 1) * cv.h);
  for (let y = 0; y < cv.h; y++) {
    raw[y * (cv.w * 3 + 1)] = 0; // filter: none
    raw.set(cv.px.subarray(y * cv.w * 3, (y + 1) * cv.w * 3), y * (cv.w * 3 + 1) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Palette (newsprint) and the front page itself.
// ---------------------------------------------------------------------------

const PAPER: RGB = [246, 241, 227];
const INK: RGB = [26, 26, 26];
const RED: RGB = [163, 22, 33];
const BLUE: RGB = [31, 78, 121];
const DARKBLUE: RGB = [18, 48, 84];
const SKY: RGB = [176, 205, 224];
const GOLD: RGB = [196, 141, 32];
const ORANGE: RGB = [224, 110, 30];
const FLAME: RGB = [240, 166, 30];
const GREY: RGB = [96, 96, 96];
const LIGHTGREY: RGB = [214, 207, 190];
const GREEN: RGB = [46, 110, 62];
const WHITE: RGB = [250, 248, 242];

const W = 1024;
const H = 1024;
const M = 28; // outer margin
const CW = W - 2 * M; // content width = 968

function rule(cv: Canvas, x: number, y: number, w: number, c: RGB, t = 2): void {
  cv.rect(x, y, w, t, c);
}

function kicker(cv: Canvas, text: string, x: number, y: number, c: RGB = RED): void {
  drawText(cv, text, x, y, 2, c);
}

// --- Pictograms -----------------------------------------------------------

// Night strike on a city: dark sky, a drone, a blast over an apartment block.
function drawNightStrike(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, DARKBLUE);
  // stars
  const stars: Array<[number, number]> = [
    [0.06, 0.12], [0.18, 0.06], [0.42, 0.14], [0.58, 0.08], [0.76, 0.16],
    [0.9, 0.06], [0.95, 0.3], [0.5, 0.26], [0.28, 0.3],
  ];
  for (const [fx, fy] of stars) cv.disc(x + Math.round(fx * w), y + Math.round(fy * h), 2, WHITE);
  // moon
  cv.disc(x + Math.round(0.86 * w), y + Math.round(0.24 * h), 12, [232, 226, 200]);
  // drone silhouette, upper left
  const dx = x + Math.round(0.24 * w);
  const dy = y + Math.round(0.26 * h);
  cv.rect(dx - 15, dy - 4, 30, 9, INK);
  cv.fatLine(dx - 24, dy - 9, dx + 24, dy - 9, 2, INK);
  cv.fatLine(dx - 24, dy + 9, dx + 24, dy + 9, 2, INK);
  cv.disc(dx - 22, dy - 9, 5, INK);
  cv.disc(dx + 22, dy - 9, 5, INK);
  cv.disc(dx - 22, dy + 9, 5, INK);
  cv.disc(dx + 22, dy + 9, 5, INK);
  cv.rect(dx - 2, dy + 5, 4, 11, INK);
  // apartment block, right, with a shattered top floor
  const bx = x + Math.round(0.58 * w);
  const bw = Math.round(0.36 * w);
  const by = y + h - 62;
  cv.rect(bx, by, bw, 62, [52, 58, 74]);
  cv.tri(bx, by, bx + Math.round(bw / 2), by - 18, bx + bw, by, [52, 58, 74]);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const lit = (r + c) % 3 === 0;
      cv.rect(bx + 8 + c * 26, by + 8 + r * 18, 14, 10, lit ? FLAME : [24, 30, 44]);
    }
  }
  // blast between drone and block
  const ex = x + Math.round(0.48 * w);
  const ey = y + Math.round(0.52 * h);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = i % 2 === 0 ? 32 : 17;
    cv.tri(ex, ey, ex + Math.round(Math.cos(a) * r), ey + Math.round(Math.sin(a) * r),
      ex + Math.round(Math.cos(a + 0.5) * r * 0.5), ey + Math.round(Math.sin(a + 0.5) * r * 0.5), ORANGE);
  }
  cv.disc(ex, ey, 13, FLAME);
  cv.disc(ex, ey, 6, [255, 236, 170]);
  // smoke curling up
  cv.disc(ex - 20, ey - 28, 8, GREY);
  cv.disc(ex - 6, ey - 38, 10, GREY);
  cv.disc(ex + 10, ey - 46, 7, GREY);
  // ground line
  cv.rect(x, y + h - 2, w, 2, GOLD);
}

// Factory fire: flame over a factory block with a smoking chimney.
function drawFactoryFire(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, [58, 30, 22]);
  // chimney with smoke
  cv.rect(x + Math.round(w * 0.7), y + 14, 16, 54, [32, 18, 14]);
  cv.disc(x + Math.round(w * 0.7) + 8, y + 8, 7, GREY);
  cv.disc(x + Math.round(w * 0.7) + 20, y + 2, 6, GREY);
  // factory silhouette
  cv.rect(x + 12, y + h - 52, w - 24, 52, [32, 18, 14]);
  // sawtooth roof
  cv.tri(x + 12, y + h - 52, x + 40, y + h - 70, x + 68, y + h - 52, [32, 18, 14]);
  cv.tri(x + 68, y + h - 52, x + 96, y + h - 70, x + 124, y + h - 52, [32, 18, 14]);
  // lit windows
  for (let i = 0; i < 5; i++) {
    cv.rect(x + 24 + i * 34, y + h - 40, 18, 13, FLAME);
  }
  // flame: layered triangles and a bright core
  const fx = x + Math.round(w * 0.45);
  const fy = y + h - 48;
  cv.tri(fx - 42, fy, fx - 6, fy - 88, fx + 42, fy, RED);
  cv.tri(fx - 28, fy, fx + 2, fy - 70, fx + 26, fy, ORANGE);
  cv.tri(fx - 16, fy, fx + 4, fy - 52, fx + 16, fy, FLAME);
  cv.disc(fx, fy - 8, 9, [255, 236, 170]);
  // embers
  cv.disc(fx - 42, fy - 56, 3, ORANGE);
  cv.disc(fx + 38, fy - 70, 3, FLAME);
  cv.disc(fx + 6, fy - 88, 3, ORANGE);
}

// Earthquake: mountain ridge split by a jagged crack, seismograph trace.
function drawQuake(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, SKY);
  // sun
  cv.disc(x + Math.round(0.84 * w), y + 20, 14, [255, 232, 150]);
  // mountain ridge
  const base = y + h - 30;
  cv.tri(x, base, x + Math.round(w * 0.22), y + 18, x + Math.round(w * 0.44), base, [96, 120, 96]);
  cv.tri(x + Math.round(w * 0.34), base, x + Math.round(w * 0.62), y + 8, x + Math.round(w * 0.9), base, [74, 100, 80]);
  // snow caps
  cv.tri(x + Math.round(w * 0.18), y + 30, x + Math.round(w * 0.22), y + 18, x + Math.round(w * 0.26), y + 30, WHITE);
  cv.tri(x + Math.round(w * 0.58), y + 22, x + Math.round(w * 0.62), y + 8, x + Math.round(w * 0.66), y + 22, WHITE);
  // jagged crack down the middle peak
  const crack: Array<[number, number]> = [
    [0.62, 0.1], [0.58, 0.3], [0.64, 0.48], [0.58, 0.66], [0.62, 0.85], [0.58, 1.0],
  ];
  for (let i = 0; i < crack.length - 1; i++) {
    cv.fatLine(
      x + Math.round(crack[i][0] * w), y + Math.round(crack[i][1] * h),
      x + Math.round(crack[i + 1][0] * w), y + Math.round(crack[i + 1][1] * h),
      4, RED,
    );
  }
  // seismograph strip along the bottom
  cv.rect(x, y + h - 22, w, 22, WHITE);
  const trace: Array<[number, number]> = [
    [0.02, 0.5], [0.1, 0.5], [0.16, 0.2], [0.22, 0.85], [0.28, 0.3], [0.34, 0.7],
    [0.42, 0.15], [0.5, 0.9], [0.58, 0.4], [0.66, 0.6], [0.74, 0.5], [0.98, 0.5],
  ];
  for (let i = 0; i < trace.length - 1; i++) {
    cv.line(
      x + Math.round(trace[i][0] * w), y + h - 22 + Math.round(trace[i][1] * 22),
      x + Math.round(trace[i + 1][0] * w), y + h - 22 + Math.round(trace[i + 1][1] * 22),
      INK,
    );
  }
}

// Globe with a crack: the COP31 fallout (talks collapsed Sunday 22 Nov).
function drawGlobe(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, [224, 232, 238]);
  const cx = x + Math.round(w / 2);
  const cy = y + Math.round(h / 2);
  const r = Math.min(w, h) / 2 - 10;
  cv.disc(cx, cy, r, [58, 120, 170]); // ocean
  // land blobs (stylised continents)
  cv.disc(cx - Math.round(r * 0.42), cy - Math.round(r * 0.28), Math.round(r * 0.26), GREEN);
  cv.disc(cx + Math.round(r * 0.34), cy + Math.round(r * 0.1), Math.round(r * 0.3), GREEN);
  cv.disc(cx + Math.round(r * 0.1), cy + Math.round(r * 0.48), Math.round(r * 0.2), GREEN);
  cv.disc(cx - Math.round(r * 0.1), cy - Math.round(r * 0.55), Math.round(r * 0.18), [240, 240, 235]); // ice cap
  // equator line and outline
  cv.line(cx - r, cy, cx + r, cy, [31, 78, 121]);
  cv.ring(cx, cy, r, DARKBLUE);
  // crack: jagged red line across the globe
  const crack: Array<[number, number]> = [
    [-0.5, -0.9], [-0.3, -0.55], [-0.55, -0.3], [-0.2, -0.05], [-0.45, 0.25],
    [-0.1, 0.45], [-0.3, 0.7], [0.0, 0.95],
  ];
  for (let i = 0; i < crack.length - 1; i++) {
    cv.fatLine(
      cx + Math.round(crack[i][0] * r), cy + Math.round(crack[i][1] * r),
      cx + Math.round(crack[i + 1][0] * r), cy + Math.round(crack[i + 1][1] * r),
      4, RED,
    );
  }
  // small "no deal" banner
  cv.rect(x + 6, y + h - 24, w - 12, 18, RED);
  drawTextCentred(cv, 'NO DEAL', x + Math.round(w / 2), y + h - 22, 2, WHITE);
}

// Two pills and a capsule: the Sanofi-Insmed deal.
function drawPills(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, [238, 240, 244]);
  const cy = y + Math.round(h / 2);
  // capsule, lying flat: red half, white half
  const capX = x + Math.round(w * 0.3);
  const capY = cy - 6;
  cv.rect(capX - 36, capY, 36, 16, RED);
  cv.rect(capX, capY, 36, 16, [232, 232, 232]);
  cv.disc(capX - 36, capY + 8, 8, RED);
  cv.disc(capX + 36, capY + 8, 8, [232, 232, 232]);
  cv.rect(capX - 36, capY, 72, 2, INK);
  cv.rect(capX - 36, capY + 14, 72, 2, INK);
  // round tablet
  cv.disc(x + Math.round(w * 0.72), cy - 6, 18, BLUE);
  cv.disc(x + Math.round(w * 0.72), cy - 6, 18, [58, 120, 170]);
  cv.line(x + Math.round(w * 0.72) - 14, cy - 6, x + Math.round(w * 0.72) + 14, cy - 6, WHITE);
  // small tablet
  cv.disc(x + Math.round(w * 0.55), cy + 18, 10, GOLD);
  cv.disc(x + Math.round(w * 0.55), cy + 18, 10, [220, 180, 80]);
  // dollar sign above
  drawText(cv, '$', x + Math.round(w * 0.82), y + 6, 3, GREEN);
}

// Rising market chart.
function drawRisingChart(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, WHITE);
  // bars, rising left to right
  const bars = [0.22, 0.3, 0.26, 0.36, 0.44, 0.42, 0.55];
  for (let i = 0; i < bars.length; i++) {
    const bw = Math.round(w / bars.length) - 6;
    const bh = Math.round(bars[i] * (h - 40));
    cv.rect(x + 6 + i * Math.round(w / bars.length), y + h - 24 - bh, bw, bh, i < 4 ? BLUE : GREEN);
  }
  // rising line
  const pts: Array<[number, number]> = [
    [0.05, 0.72], [0.2, 0.62], [0.35, 0.66], [0.5, 0.48], [0.65, 0.5], [0.8, 0.32], [0.95, 0.2],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    cv.fatLine(
      x + Math.round(pts[i][0] * w), y + Math.round(pts[i][1] * h),
      x + Math.round(pts[i + 1][0] * w), y + Math.round(pts[i + 1][1] * h),
      3, GREEN,
    );
  }
  // arrow head at the end
  const ax = x + Math.round(0.95 * w);
  const ay = y + Math.round(0.2 * h);
  cv.tri(ax, ay, ax - 12, ay + 2, ax - 2, ay - 12, GREEN);
  cv.line(x + 4, y + h - 24, x + w - 4, y + h - 24, INK);
}

// American football, for the Super Bowl strip.
function drawFootball(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, h, [226, 238, 214]);
  const cx = x + Math.round(w / 2);
  const cy = y + Math.round(h / 2);
  // ball body: stacked discs, widest in the middle
  const rows: Array<[number, number]> = [
    [-14, 3], [-10, 6], [-5, 9], [0, 10], [5, 9], [10, 6], [14, 3],
  ];
  for (const [dy, r] of rows) {
    cv.disc(cx, cy + dy, r, [122, 72, 32]);
  }
  // laces
  cv.line(cx - 8, cy - 2, cx + 8, cy - 2, WHITE);
  for (let i = -2; i <= 2; i++) {
    cv.line(cx + i * 3, cy - 5, cx + i * 3, cy + 1, WHITE);
  }
}

// ---------------------------------------------------------------------------
// The front page.
// ---------------------------------------------------------------------------

function drawFrontPage(): Canvas {
  const cv = new Canvas(W, H, PAPER);
  const ink = INK;

  // ---- Masthead ------------------------------------------------------------
  rule(cv, M, 24, CW, ink, 4);
  drawTextCentred(cv, 'THE WORLD', W / 2, 36, 8, ink);
  drawTextCentred(cv, 'IN ONE PICTURE', W / 2, 100, 3, RED);
  rule(cv, M, 128, CW, ink, 2);
  // Date line — the day this page sums up, big and red.
  drawTextCentred(cv, 'TUESDAY, 24 NOVEMBER 2026', W / 2, 140, 4, RED);
  rule(cv, M, 172, CW, ink, 4);

  // ---- Lead story: the Zaporizhzhia strike ---------------------------------
  let y = 190;
  kicker(cv, 'LEAD  •  WAR IN UKRAINE', M, y);
  y += 22;
  drawText(cv, 'STRIKE HITS', M, y, 5, ink);
  y += 44;
  drawText(cv, 'ZAPORIZHZHIA', M, y, 5, ink);
  y += 44;
  // Scene on the right of the lead headline block.
  cv.clipped(640, 190, 356, 132, () => drawNightStrike(cv, 640, 190, 356, 132));
  // Lead body, left column under the headline.
  y = 296;
  drawPara(
    cv,
    'A Russian overnight strike destroys homes in Zaporizhzhia, killing two and wounding 44, among them four children. Kyiv defends its Libya warship strike as self-defence.',
    M, y, 2, 592, ink,
  );
  // Thin rule under the lead.
  rule(cv, M, 384, CW, LIGHTGREY, 2);

  // ---- Row 2: two half-width stories ---------------------------------------
  const row2Y = 400;
  const halfW = Math.floor((CW - 24) / 2); // 472
  // Left: Indonesia factory fire — Tuesday's confirmed toll.
  kicker(cv, 'INDONESIA', M, row2Y);
  drawText(cv, '26 DEAD AS FIRE', M, row2Y + 22, 4, ink);
  drawText(cv, 'TOLL CONFIRMED', M, row2Y + 58, 4, ink);
  drawText(cv, '8 STILL MISSING', M, row2Y + 94, 4, RED);
  cv.clipped(M, row2Y + 132, halfW, 108, () => drawFactoryFire(cv, M, row2Y + 132, halfW, 108));
  drawPara(
    cv,
    'Three days after the candy factory in Cikande, Banten, burned, the toll is confirmed on Tuesday. Police open a criminal inquiry into negligence.',
    M, row2Y + 248, 2, halfW, ink,
  );
  // Right: Nepal earthquake.
  const rx = M + halfW + 24;
  kicker(cv, 'NEPAL', rx, row2Y);
  drawText(cv, 'QUAKE SHAKES', rx, row2Y + 22, 4, ink);
  drawText(cv, 'EASTERN NEPAL', rx, row2Y + 58, 4, ink);
  drawText(cv, 'NO CASUALTIES', rx, row2Y + 94, 4, GREEN);
  cv.clipped(rx, row2Y + 132, halfW, 108, () => drawQuake(cv, rx, row2Y + 132, halfW, 108));
  drawPara(
    cv,
    'A magnitude 5.6 quake strikes Taplejung at 07:17, felt in India and Bangladesh. No casualties are reported.',
    rx, row2Y + 248, 2, halfW, ink,
  );
  rule(cv, M, 714, CW, LIGHTGREY, 2);

  // ---- Row 3: three columns -------------------------------------------------
  const row3Y = 730;
  const thirdW = Math.floor((CW - 48) / 3); // 306
  const cols = [M, M + thirdW + 24, M + 2 * (thirdW + 24)];
  // COP31 fallout — labelled with its real date, Sunday 22 Nov.
  kicker(cv, 'CLIMATE  •  COP31 - 22 NOV', cols[0], row3Y);
  drawText(cv, 'COP31: TWO DAYS', cols[0], row3Y + 22, 3, ink);
  drawText(cv, 'THE BLAME GAME', cols[0], row3Y + 46, 3, ink);
  cv.clipped(cols[0], row3Y + 72, thirdW, 72, () => drawGlobe(cv, cols[0], row3Y + 72, thirdW, 72));
  drawPara(
    cv,
    'Antalya ended Sunday with no fossil-fuel deal. Nations trade blame.',
    cols[0], row3Y + 152, 2, thirdW, ink, 1.4,
  );
  // Sanofi buys Insmed.
  kicker(cv, 'BUSINESS', cols[1], row3Y);
  drawText(cv, 'SANOFI BUYS', cols[1], row3Y + 22, 3, ink);
  drawText(cv, 'INSMED, $41BN', cols[1], row3Y + 46, 3, ink);
  cv.clipped(cols[1], row3Y + 72, thirdW, 72, () => drawPills(cv, cols[1], row3Y + 72, thirdW, 72));
  drawPara(
    cv,
    "Sanofi agrees the year's biggest pharma deal: $175 a share, in cash.",
    cols[1], row3Y + 152, 2, thirdW, ink, 1.4,
  );
  // Markets rebound.
  kicker(cv, 'MARKETS', cols[2], row3Y);
  drawText(cv, 'WALL ST REBOUNDS', cols[2], row3Y + 22, 3, ink);
  drawText(cv, 'LED BY NVIDIA', cols[2], row3Y + 46, 3, ink);
  cv.clipped(cols[2], row3Y + 72, thirdW, 72, () => drawRisingChart(cv, cols[2], row3Y + 72, thirdW, 72));
  drawPara(
    cv,
    "Stocks recover after last week's slide, led by Nvidia's jump.",
    cols[2], row3Y + 152, 2, thirdW, ink, 1.4,
  );
  rule(cv, M, 946, CW, LIGHTGREY, 2);

  // ---- Also strip + footer --------------------------------------------------
  const row4Y = 956;
  cv.clipped(M, row4Y, 46, 40, () => drawFootball(cv, M, row4Y, 46, 40));
  drawText(cv, 'ALSO:', M + 58, row4Y + 4, 2, RED);
  drawText(
    cv,
    'STATES SUE MUSK OVER GROK IMAGES; US LOSES MEASLES-FREE STATUS',
    M + 58, row4Y + 22, 2, ink,
  );
  rule(cv, M, 1002, CW, ink, 2);
  drawTextCentred(
    cv,
    "24 NOVEMBER 2026  •  COMPILED FROM THE DAY'S REPORTING  •  SUPER BOWL 61 HEADS TO IMAX",
    W / 2, 1010, 1, GREY,
  );

  return cv;
}

// ---------------------------------------------------------------------------

function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  const cv = drawFrontPage();
  const png = encodePNG(cv);
  writeFileSync(join(outDir, 'entry.png'), png);
}

main();
