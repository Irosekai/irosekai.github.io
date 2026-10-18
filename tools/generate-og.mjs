/**
 * 生成社交分享图 assets/og.png（1200×630）。
 * 纯 Node 实现：手写 PNG 编码器 + 逐像素渲染，零依赖。
 *
 *   node tools/generate-og.mjs
 *
 * 想换成带文字的设计？把你的成品导出为 1200×630 PNG 覆盖同名文件即可，
 * 或者在这里改配色与构图。
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WIDTH = 1200;
const HEIGHT = 630;
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), '../assets/og.png');

/* ── PNG 编码 ───────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ── 调色与数学 ─────────────────────────────────────────────── */

const SPECTRUM = [
  [0x7c, 0x5c, 0xff],
  [0x22, 0xd9, 0xe8],
  [0xb6, 0xff, 0x5c],
  [0xff, 0xb3, 0x47],
  [0xff, 0x3d, 0x9a],
];

/** t ∈ [0,1] → 光谱色（循环） */
function spectrumAt(t) {
  const wrapped = ((t % 1) + 1) % 1;
  const scaled = wrapped * SPECTRUM.length;
  const i = Math.floor(scaled) % SPECTRUM.length;
  const j = (i + 1) % SPECTRUM.length;
  const f = scaled - Math.floor(scaled);
  const a = SPECTRUM[i];
  const b = SPECTRUM[j];
  return [
    a[0] + (b[0] - a[0]) * f,
    a[1] + (b[1] - a[1]) * f,
    a[2] + (b[2] - a[2]) * f,
  ];
}

/** 高斯软斑 */
const blob = (dist, radius) => Math.exp(-Math.pow(dist / radius, 2) * 2.2);

/** 4×4 Bayer 有序抖动矩阵，归一到 [-0.5, 0.5] */
const BAYER = (() => {
  const m = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
  ];
  return Float32Array.from(m.flat().map((v) => v / 16 - 0.5));
})();

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

/* ── 渲染 ───────────────────────────────────────────────────── */

function render() {
  const rgba = Buffer.alloc(WIDTH * HEIGHT * 4);
  const cx = WIDTH / 2;

  // 光斑布局：[x, y, 半径, 颜色, 强度]
  const blobs = [
    [200, 60, 520, SPECTRUM[0], 0.62],
    [1080, 140, 430, SPECTRUM[1], 0.34],
    [820, 700, 470, SPECTRUM[4], 0.30],
    [90, 660, 400, SPECTRUM[3], 0.16],
  ];

  // 光环（呼应 logo）
  const orb = { x: 935, y: 315, radius: 152, width: 26 };

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      // 底色 #05060b + 顶部深蓝
      let r = 5;
      let g = 6;
      let b = 11;

      const topGlow = Math.max(0, 1 - Math.hypot((x - cx) / 900, (y + 130) / 640));
      r += 16 * topGlow;
      g += 22 * topGlow;
      b += 48 * topGlow;

      // 极光光斑
      for (const [bx, by, br, color, strength] of blobs) {
        const d = Math.hypot(x - bx, y - by);
        const amount = blob(d, br) * strength;
        r += color[0] * amount * 0.5;
        g += color[1] * amount * 0.5;
        b += color[2] * amount * 0.5;
      }

      // 斜向光谱带
      const nx = x / WIDTH;
      const ny = y / HEIGHT;
      const bandY = 0.66 - 0.3 * nx;
      const band = Math.exp(-Math.pow((ny - bandY) / 0.05, 2));
      if (band > 0.002) {
        const c = spectrumAt(nx);
        r += c[0] * band * 0.9;
        g += c[1] * band * 0.9;
        b += c[2] * band * 0.9;
      }

      // 光环
      const od = Math.hypot(x - orb.x, y - orb.y);
      const ring = Math.exp(-Math.pow((od - orb.radius) / orb.width, 2));
      if (ring > 0.002) {
        const angle = (Math.atan2(y - orb.y, x - orb.x) / (Math.PI * 2) + 1) % 1;
        const c = spectrumAt(angle);
        r += c[0] * ring * 0.95;
        g += c[1] * ring * 0.95;
        b += c[2] * ring * 0.95;
      }

      // 环内柔光
      const inner = Math.exp(-od / 130) * 0.3;
      r += 124 * inner;
      g += 92 * inner;
      b += 255 * inner;

      // 暗角
      const vignette =
        1 - 0.6 * Math.pow(Math.min(1, Math.hypot(nx - 0.5, ny - 0.5) * 1.42), 2.1);
      r *= vignette;
      g *= vignette;
      b *= vignette;

      // 有序抖动（4×4 Bayer）——比随机噪点压缩率高一个数量级，
      // 又能抑制大面积渐变上的色带。
      const dither = BAYER[(y & 3) * 4 + (x & 3)] * 2.2;
      r += dither;
      g += dither;
      b += dither;

      const offset = (y * WIDTH + x) * 4;
      rgba[offset] = clamp255(r);
      rgba[offset + 1] = clamp255(g);
      rgba[offset + 2] = clamp255(b);
      rgba[offset + 3] = 255;
    }
  }

  return rgba;
}

const started = Date.now();
mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, encodePNG(WIDTH, HEIGHT, render()));

console.log(
  `✓ ${OUTPUT} — ${WIDTH}×${HEIGHT}, ${((Date.now() - started) / 1000).toFixed(2)}s`
);
