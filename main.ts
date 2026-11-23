// news-image-20261124 — "The World in One Picture"
// A newspaper front page for Tuesday 24 November 2026, drawn programmatically
// with a tiny rasterizer, a 5x7 bitmap font and a hand-rolled PNG encoder.
// Node 22, standard library only. No network, no randomness: the same input
// always produces the same bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The day's news (researched 24 Nov 2026, ~04:30 WIB, from live reporting):
//   - Russian drone strike hits the Kyiv region; several killed and missing
//     (Zelenskyy); a Russian cargo ship burns off Finland after a reported attack
//   - Indonesia: search goes on at the burned candy factory in Cikande, Banten;
//     24 confirmed dead, about 30 workers still missing
//   - India and Nepal open the Saryu-Kamala Express rail link; 8 deals and a
//     Rs 15,000 crore package
//   - Thousands march in Lisbon against the rising cost of living
//   - COP31 fallout: after the Antalya collapse, nations trade blame over the
//     missing fossil-fuel deal
//   - Wall Street slides after the Democrats' midterm wins
//   - Sport: Rishabh Pant hits 128 as the India-New Zealand Test ends in a draw;
//     Max Verstappen wins the Las Vegas Grand Prix

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ---------------------------------------------------------------------------
// 5x7 bitmap font. Each glyph is 7 rows of 5 cells, '#' = ink, '.' = blank.
// Written out by hand for this entry (uppercase, lowercase, digits, punctuation).
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  a: ['.....', '.....', '.####', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['.....', '.....', '.####', '#....', '#....', '#....', '.####'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  f: ['..##.', '.#...', '.#...', '####.', '.#...', '.#...', '.#...'],
  g: ['.....', '.####', '#...#', '#...#', '.####', '....#', '.###.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['.....', '..#..', '.....', '.##..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '#..#.', '.##..'],
  k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '####.', '#...#', '#...#', '####.', '#....', '#....'],
  q: ['.....', '.####', '#...#', '#...#', '.####', '....#', '....#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#...', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '...#.', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '&': ['.##..', '#..#.', '#..#.', '.#...', '#.#.#', '#..#.', '.##.#'],
  '%': ['#...#', '#..#.', '...#.', '..#..', '.#...', '#..#.', '#...#'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  $: ['..#..', '.####', '#.#.#', '.###.', '..#.#', '####.', '..#..'],
  '\u2022': ['.....', '.....', '..#..', '.###.', '.###.', '..#..', '.....'],
};

// ---------------------------------------------------------------------------
// Raster canvas: a plain RGB buffer with drawing primitives.
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array; // RGB, row-major
  clip: { x: number; y: number; w: number; h: number } | null = null;

  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 3);
    this.fillRect(0, 0, w, h, bg);
  }

  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (this.clip && (x < this.clip.x || y < this.clip.y || x >= this.clip.x + this.clip.w || y >= this.clip.y + this.clip.h)) return;
    const i = (y * this.w + x) * 3;
    this.px[i] = c[0];
    this.px[i + 1] = c[1];
    this.px[i + 2] = c[2];
  }

  fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.w, Math.ceil(x + w));
    const y1 = Math.min(this.h, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.set(xx, yy, c);
    }
  }

  // Filled circle.
  disc(cx: number, cy: number, r: number, c: RGB): void {
    const r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= r2) this.set(x, y, c);
      }
    }
  }

  // Circle outline, 1-2 px thick.
  ring(cx: number, cy: number, r: number, c: RGB): void {
    for (let a = 0; a < 360; a += 1) {
      const rad = (a * Math.PI) / 180;
      this.set(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
      this.set(Math.round(cx + (r - 1) * Math.cos(rad)), Math.round(cy + (r - 1) * Math.sin(rad)), c);
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
      this.set(x, y, c);
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

  // Thick line: draws the line several times, offset perpendicular.
  thickLine(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
    const half = Math.floor(t / 2);
    for (let i = -half; i <= half; i++) {
      this.line(x0 + i, y0, x1 + i, y1, c);
      this.line(x0, y0 + i, x1, y1 + i, c);
    }
  }

  // Filled triangle.
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
        if (a >= 0 && b >= 0 && cc >= 0) this.set(x, y, c);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Text: measure, wrap and draw with the bitmap font.
// ---------------------------------------------------------------------------

const CHAR_W = 6; // 5 cells + 1 spacing, in font units
const CHAR_H = 7;

function textWidth(text: string, scale: number): number {
  return text.length * CHAR_W * scale - scale; // no trailing space
}

function drawChar(cv: Canvas, ch: string, x: number, y: number, scale: number, c: RGB): void {
  const glyph = FONT[ch] ?? FONT['?'];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row][col] === '#') {
        cv.fillRect(x + col * scale, y + row * scale, scale, scale, c);
      }
    }
  }
}

function drawText(cv: Canvas, text: string, x: number, y: number, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of text) {
    drawChar(cv, ch, cx, y, scale, c);
    cx += CHAR_W * scale;
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
  const lh = Math.round(CHAR_H * scale * leading);
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
  cv.fillRect(x, y, w, t, c);
}

function kicker(cv: Canvas, text: string, x: number, y: number, c: RGB = RED): void {
  drawText(cv, text, x, y, 2, c);
}

// Run fn with drawing clipped to a box, so a pictogram can never spill
// onto the text around it.
function clipDraw(cv: Canvas, x: number, y: number, w: number, h: number, fn: () => void): void {
  const prev = cv.clip;
  cv.clip = { x, y, w, h };
  fn();
  cv.clip = prev;
}

// --- Pictograms -----------------------------------------------------------

// Drone strike over a town at dusk: dark sky, drone silhouette, explosion burst.
function drawDroneScene(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, DARKBLUE);
  // stars
  const stars: Array<[number, number]> = [
    [0.08, 0.15], [0.2, 0.08], [0.35, 0.2], [0.55, 0.1], [0.7, 0.18],
    [0.85, 0.08], [0.93, 0.25], [0.45, 0.3], [0.62, 0.32],
  ];
  for (const [fx, fy] of stars) cv.disc(x + Math.round(fx * w), y + Math.round(fy * h), 2, WHITE);
  // moon
  cv.disc(x + Math.round(0.82 * w), y + Math.round(0.22 * h), 13, [232, 226, 200]);
  // drone silhouette
  const dx = x + Math.round(0.3 * w);
  const dy = y + Math.round(0.3 * h);
  cv.fillRect(dx - 16, dy - 5, 32, 10, INK);
  cv.thickLine(dx - 26, dy - 10, dx + 26, dy - 10, 2, INK);
  cv.thickLine(dx - 26, dy + 10, dx + 26, dy + 10, 2, INK);
  cv.disc(dx - 24, dy - 10, 5, INK);
  cv.disc(dx + 24, dy - 10, 5, INK);
  cv.disc(dx - 24, dy + 10, 5, INK);
  cv.disc(dx + 24, dy + 10, 5, INK);
  cv.fillRect(dx - 2, dy + 5, 4, 12, INK);
  // explosion burst over the town
  const ex = x + Math.round(0.68 * w);
  const ey = y + Math.round(0.48 * h);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = i % 2 === 0 ? 34 : 18;
    cv.tri(ex, ey, ex + Math.round(Math.cos(a) * r), ey + Math.round(Math.sin(a) * r),
      ex + Math.round(Math.cos(a + 0.5) * r * 0.5), ey + Math.round(Math.sin(a + 0.5) * r * 0.5), ORANGE);
  }
  cv.disc(ex, ey, 14, FLAME);
  cv.disc(ex, ey, 7, [255, 236, 170]);
  // town skyline
  const gy = y + h - 26;
  const blocks: Array<[number, number, number]> = [
    [0.02, 0.1, 34], [0.14, 0.16, 52], [0.32, 0.12, 40], [0.46, 0.2, 60],
    [0.68, 0.14, 44], [0.84, 0.18, 56],
  ];
  for (const [fx, fw, fh] of blocks) {
    cv.fillRect(x + Math.round(fx * w), gy - fh, Math.round(fw * w), fh + 26, [12, 26, 48]);
  }
  cv.fillRect(x, gy + 24, w, 2, GOLD);
  // smoke
  cv.disc(ex - 22, ey - 30, 9, GREY);
  cv.disc(ex - 8, ey - 40, 11, GREY);
  cv.disc(ex + 8, ey - 48, 8, GREY);
}

// Factory fire: flame over a factory block.
function drawFactoryFire(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, [58, 30, 22]);
  // factory silhouette
  cv.fillRect(x + 12, y + h - 58, w - 24, 58, [32, 18, 14]);
  cv.fillRect(x + Math.round(w * 0.62), y + h - 96, 16, 96, [32, 18, 14]);
  cv.fillRect(x + Math.round(w * 0.62) - 4, y + h - 100, 24, 6, [32, 18, 14]);
  // lit windows
  for (let i = 0; i < 5; i++) {
    cv.fillRect(x + 24 + i * 34, y + h - 44, 18, 14, FLAME);
  }
  // flame: layered triangles and discs
  const fx = x + Math.round(w * 0.5);
  const fy = y + h - 52;
  cv.tri(fx - 44, fy, fx - 6, fy - 92, fx + 44, fy, RED);
  cv.tri(fx - 30, fy, fx + 2, fy - 74, fx + 28, fy, ORANGE);
  cv.tri(fx - 18, fy, fx + 4, fy - 56, fx + 18, fy, FLAME);
  cv.disc(fx, fy - 8, 10, [255, 236, 170]);
  // embers
  cv.disc(fx - 44, fy - 60, 3, ORANGE);
  cv.disc(fx + 40, fy - 74, 3, FLAME);
  cv.disc(fx + 8, fy - 92, 3, ORANGE);
}

// Train crossing a bridge: new rail link between India and Nepal.
function drawTrain(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, SKY);
  cv.disc(x + Math.round(0.84 * w), y + 22, 16, [255, 232, 150]); // sun
  // hills
  cv.disc(x + Math.round(0.12 * w), y + h, 90, [122, 158, 110]);
  cv.disc(x + Math.round(0.9 * w), y + h + 10, 110, [102, 140, 96]);
  // bridge + rails
  const ry = y + h - 34;
  cv.fillRect(x, ry, w, 6, [90, 70, 52]);
  for (let i = 0; i < 8; i++) cv.fillRect(x + 8 + i * Math.round(w / 8), ry + 6, 8, 18, [90, 70, 52]);
  // locomotive
  const tx = x + 16;
  const ty = ry - 52;
  cv.fillRect(tx, ty, 96, 52, [178, 34, 34]); // engine body
  cv.fillRect(tx + 66, ty - 16, 30, 16, [178, 34, 34]); // cab
  cv.fillRect(tx + 70, ty - 12, 20, 10, SKY); // cab window
  cv.fillRect(tx + 8, ty + 8, 20, 14, SKY); // front window
  cv.fillRect(tx + 8, ty + 30, 80, 6, GOLD); // stripe
  // carriages
  for (let i = 0; i < 2; i++) {
    const cx = tx + 104 + i * 74;
    cv.fillRect(cx, ty + 6, 68, 46, [31, 78, 121]);
    for (let j = 0; j < 3; j++) cv.fillRect(cx + 8 + j * 20, ty + 14, 12, 12, SKY);
    cv.fillRect(cx, ty + 40, 68, 6, GOLD);
  }
  // wheels
  const wheels = [tx + 18, tx + 46, tx + 76, tx + 122, tx + 156, tx + 196, tx + 230];
  for (const wx of wheels) {
    cv.disc(wx, ry - 2, 7, INK);
    cv.disc(wx, ry - 2, 3, GREY);
  }
}

// Globe with a crack: the COP31 fallout.
function drawGlobe(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, [224, 232, 238]);
  const cx = x + Math.round(w / 2);
  const cy = y + Math.round(h / 2);
  const r = Math.min(w, h) / 2 - 10;
  cv.disc(cx, cy, r, BLUE);
  cv.disc(cx, cy, r, [58, 120, 170]); // ocean light
  // land blobs (stylised continents)
  cv.disc(cx - Math.round(r * 0.42), cy - Math.round(r * 0.28), Math.round(r * 0.26), GREEN);
  cv.disc(cx + Math.round(r * 0.34), cy + Math.round(r * 0.1), Math.round(r * 0.3), GREEN);
  cv.disc(cx + Math.round(r * 0.1), cy + Math.round(r * 0.48), Math.round(r * 0.2), GREEN);
  cv.disc(cx - Math.round(r * 0.1), cy - Math.round(r * 0.55), Math.round(r * 0.18), [240, 240, 235]); // ice cap
  // meridian + equator lines
  cv.ring(cx, cy, r, DARKBLUE);
  cv.line(cx - r, cy, cx + r, cy, [31, 78, 121]);
  // crack: jagged red line across the globe
  const crack: Array<[number, number]> = [
    [-0.5, -0.9], [-0.3, -0.55], [-0.55, -0.3], [-0.2, -0.05], [-0.45, 0.25],
    [-0.1, 0.45], [-0.3, 0.7], [0.0, 0.95],
  ];
  for (let i = 0; i < crack.length - 1; i++) {
    cv.thickLine(
      cx + Math.round(crack[i][0] * r), cy + Math.round(crack[i][1] * r),
      cx + Math.round(crack[i + 1][0] * r), cy + Math.round(crack[i + 1][1] * r),
      4, RED,
    );
  }
  // small "no deal" banner
  cv.fillRect(x + 6, y + h - 26, w - 12, 20, RED);
  drawTextCentred(cv, 'NO DEAL', x + Math.round(w / 2), y + h - 23, 2, WHITE);
}

// Crowd with placards: Lisbon protest.
function drawCrowd(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, [232, 222, 198]);
  // placards (blank boards: text here would collide with the crowd heads)
  cv.fillRect(x + 14, y + 8, 54, 30, WHITE);
  cv.thickLine(x + 40, y + 38, x + 40, y + 62, 3, INK);
  cv.fillRect(x + Math.round(w * 0.58), y + 6, 58, 30, WHITE);
  cv.thickLine(x + Math.round(w * 0.58) + 28, y + 36, x + Math.round(w * 0.58) + 28, y + 60, 3, INK);
  // crowd: heads and shoulders
  const skin: RGB = [214, 164, 120];
  const shirts: RGB[] = [RED, BLUE, GREEN, GOLD, [120, 60, 120], [40, 110, 110]];
  for (let i = 0; i < 9; i++) {
    const px = x + 18 + i * Math.round((w - 36) / 8);
    const py = y + h - 34 - (i % 3) * 8;
    cv.disc(px, py - 14, 9, skin);
    cv.fillRect(px - 11, py - 6, 22, 22, shirts[i % shirts.length]);
    // raised arm on some
    if (i % 3 === 0) cv.thickLine(px + 8, py - 2, px + 16, py - 22, 3, shirts[i % shirts.length]);
  }
  cv.fillRect(x, y + h - 14, w, 14, [120, 100, 70]); // street
}

// Falling market chart.
function drawChart(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, WHITE);
  // bars
  const bars = [0.55, 0.62, 0.5, 0.42, 0.3, 0.36, 0.22];
  for (let i = 0; i < bars.length; i++) {
    const bw = Math.round(w / bars.length) - 6;
    const bh = Math.round(bars[i] * (h - 40));
    cv.fillRect(x + 6 + i * Math.round(w / bars.length), y + h - 24 - bh, bw, bh, i < 4 ? BLUE : RED);
  }
  // falling line
  const pts: Array<[number, number]> = [
    [0.05, 0.22], [0.2, 0.3], [0.35, 0.28], [0.5, 0.45], [0.65, 0.42], [0.8, 0.62], [0.95, 0.72],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    cv.thickLine(
      x + Math.round(pts[i][0] * w), y + Math.round(pts[i][1] * h),
      x + Math.round(pts[i + 1][0] * w), y + Math.round(pts[i + 1][1] * h),
      3, RED,
    );
  }
  // arrow head at the end
  const ex = x + Math.round(0.95 * w);
  const ey = y + Math.round(0.72 * h);
  cv.tri(ex, ey, ex - 12, ey - 2, ex - 2, ey + 12, RED);
  cv.line(x + 4, y + h - 24, x + w - 4, y + h - 24, INK);
}

// Cricket bat, ball and stumps for the sport strip.
function drawSport(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.fillRect(x, y, w, h, [226, 238, 214]);
  // pitch
  cv.fillRect(x, y + Math.round(h * 0.62), w, Math.round(h * 0.38), [196, 176, 128]);
  // stumps
  for (let i = 0; i < 3; i++) {
    cv.fillRect(x + Math.round(w * 0.72) + i * 7, y + Math.round(h * 0.34), 4, Math.round(h * 0.28), GOLD);
  }
  cv.fillRect(x + Math.round(w * 0.72), y + Math.round(h * 0.32), 22, 3, GOLD);
  // bat (leaning)
  cv.thickLine(x + Math.round(w * 0.3), y + Math.round(h * 0.2), x + Math.round(w * 0.45), y + Math.round(h * 0.75), 10, [214, 186, 130]);
  cv.thickLine(x + Math.round(w * 0.28), y + Math.round(h * 0.12), x + Math.round(w * 0.3), y + Math.round(h * 0.2), 5, INK);
  // ball
  cv.disc(x + Math.round(w * 0.58), y + Math.round(h * 0.55), 9, RED);
  cv.disc(x + Math.round(w * 0.58), y + Math.round(h * 0.55), 4, [255, 120, 120]);
  // motion lines
  cv.line(x + Math.round(w * 0.5), y + Math.round(h * 0.4), x + Math.round(w * 0.55), y + Math.round(h * 0.48), GREY);
  cv.line(x + Math.round(w * 0.48), y + Math.round(h * 0.55), x + Math.round(w * 0.54), y + Math.round(h * 0.6), GREY);
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

  // ---- Lead story: war in Ukraine ------------------------------------------
  let y = 190;
  kicker(cv, 'LEAD  •  WAR IN UKRAINE', M, y);
  y += 22;
  drawText(cv, 'DRONE STRIKE HITS', M, y, 5, ink);
  y += 44;
  drawText(cv, 'KYIV REGION', M, y, 5, ink);
  y += 44;
  // Scene on the right of the lead headline block.
  clipDraw(cv, 640, 190, 356, 132, () => drawDroneScene(cv, 640, 190, 356, 132));
  // Lead body, left column under the headline.
  y = 296;
  drawPara(
    cv,
    'Several people are killed and missing after a Russian drone strike in the Kyiv region, President Zelenskyy says. A Russian cargo ship burns off Finland after a reported attack.',
    M, y, 2, 592, ink,
  );
  // Thin rule under the lead.
  rule(cv, M, 384, CW, LIGHTGREY, 2);

  // ---- Row 2: two half-width stories ---------------------------------------
  const row2Y = 400;
  const halfW = Math.floor((CW - 24) / 2); // 472
  // Left: Indonesia factory fire.
  kicker(cv, 'INDONESIA', M, row2Y);
  drawText(cv, '24 DEAD AS', M, row2Y + 22, 4, ink);
  drawText(cv, 'FACTORY FIRE', M, row2Y + 58, 4, ink);
  drawText(cv, 'SEARCH GOES ON', M, row2Y + 94, 4, RED);
  clipDraw(cv, M, row2Y + 132, halfW, 108, () => drawFactoryFire(cv, M, row2Y + 132, halfW, 108));
  drawPara(
    cv,
    'Rescuers comb the burned candy factory in Cikande, Banten, for about 30 workers still missing.',
    M, row2Y + 248, 2, halfW, ink,
  );
  // Right: India-Nepal rail link.
  const rx = M + halfW + 24;
  kicker(cv, 'INDIA  •  NEPAL', rx, row2Y);
  drawText(cv, 'A NEW RAIL LINK', rx, row2Y + 22, 4, ink);
  drawText(cv, 'ACROSS THE', rx, row2Y + 58, 4, ink);
  drawText(cv, 'BORDER', rx, row2Y + 94, 4, ink);
  clipDraw(cv, rx, row2Y + 132, halfW, 108, () => drawTrain(cv, rx, row2Y + 132, halfW, 108));
  drawPara(
    cv,
    'Modi and Nepal PM Balendra Shah flag off the Saryu-Kamala Express. Eight deals and a Rs 15,000 crore package.',
    rx, row2Y + 248, 2, halfW, ink,
  );
  rule(cv, M, 714, CW, LIGHTGREY, 2);

  // ---- Row 3: three columns -------------------------------------------------
  const row3Y = 730;
  const thirdW = Math.floor((CW - 48) / 3); // 306
  const cols = [M, M + thirdW + 24, M + 2 * (thirdW + 24)];
  // COP31 fallout
  kicker(cv, 'CLIMATE  •  COP31', cols[0], row3Y);
  drawText(cv, 'AFTER COP31,', cols[0], row3Y + 22, 3, ink);
  drawText(cv, 'THE BLAME GAME', cols[0], row3Y + 46, 3, ink);
  clipDraw(cv, cols[0], row3Y + 72, thirdW, 72, () => drawGlobe(cv, cols[0], row3Y + 72, thirdW, 72));
  drawPara(
    cv,
    'Antalya talks ended with no fossil-fuel deal. Nations trade blame.',
    cols[0], row3Y + 152, 2, thirdW, ink,
  );
  // Lisbon protest
  kicker(cv, 'PORTUGAL', cols[1], row3Y);
  drawText(cv, 'THOUSANDS MARCH', cols[1], row3Y + 22, 3, ink);
  drawText(cv, 'IN LISBON', cols[1], row3Y + 46, 3, ink);
  clipDraw(cv, cols[1], row3Y + 72, thirdW, 72, () => drawCrowd(cv, cols[1], row3Y + 72, thirdW, 72));
  drawPara(
    cv,
    'Streets fill with protesters against the rising cost of living.',
    cols[1], row3Y + 152, 2, thirdW, ink,
  );
  // Markets
  kicker(cv, 'MARKETS', cols[2], row3Y);
  drawText(cv, 'WALL ST SLIDES', cols[2], row3Y + 22, 3, ink);
  drawText(cv, 'AFTER MIDTERMS', cols[2], row3Y + 46, 3, ink);
  clipDraw(cv, cols[2], row3Y + 72, thirdW, 72, () => drawChart(cv, cols[2], row3Y + 72, thirdW, 72));
  drawPara(
    cv,
    "Stocks slide after the Democrats' midterm wins. Trump blames the Democrats.",
    cols[2], row3Y + 152, 2, thirdW, ink,
  );
  rule(cv, M, 946, CW, LIGHTGREY, 2);

  // ---- Sport strip + footer -------------------------------------------------
  const row4Y = 956;
  clipDraw(cv, M, row4Y, 46, 40, () => drawSport(cv, M, row4Y, 46, 40));
  drawText(cv, 'SPORT:', M + 58, row4Y + 4, 2, RED);
  drawText(
    cv,
    'PANT HITS 128 AS INDIA-NZ TEST ENDS IN A DRAW; VERSTAPPEN WINS IN VEGAS',
    M + 58, row4Y + 22, 2, ink,
  );
  rule(cv, M, 1002, CW, ink, 2);
  drawTextCentred(
    cv,
    "24 NOVEMBER 2026  •  COMPILED FROM THE DAY'S REPORTING  •  ALSO: MYANMAR HITS OUT AT ASEAN; ARMENIA PROPOSES A NEW CONSTITUTION",
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
