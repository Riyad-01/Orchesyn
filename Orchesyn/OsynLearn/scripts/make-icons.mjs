import zlib from 'node:zlib';
import fs from 'node:fs';

const BARS = [
  { x: 0.211, w: 0.066, y0: 0.414, y1: 0.586 },
  { x: 0.320, w: 0.066, y0: 0.328, y1: 0.672 },
  { x: 0.430, w: 0.066, y0: 0.234, y1: 0.766 },
  { x: 0.539, w: 0.066, y0: 0.328, y1: 0.672 },
  { x: 0.648, w: 0.066, y0: 0.400, y1: 0.604 },
  { x: 0.758, w: 0.066, y0: 0.453, y1: 0.547 },
];

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, draw) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size);
      const o = y * stride + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// brand gradient across the bar group
function barColor(t) {
  const stops = [[124, 92, 255], [168, 92, 255], [46, 230, 168]];
  const p = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(p));
  const f = p - i;
  return stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
}

function drawIcon(x, y, size, { corner = 0.226 } = {}) {
  const r = size * corner;
  // rounded-square mask
  const dx = Math.max(r - x, x - (size - r), 0);
  const dy = Math.max(r - y, y - (size - r), 0);
  if (dx * dx + dy * dy > r * r) return [0, 0, 0, 0];

  const bg = [10, 10, 18, 255];
  for (let i = 0; i < BARS.length; i++) {
    const b = BARS[i];
    const bx0 = b.x * size, bx1 = bx0 + b.w * size;
    const by0 = b.y0 * size, by1 = b.y1 * size;
    const rad = b.w * size / 2;
    const cx = Math.max(bx0 + rad - x, x - (bx1 - rad), 0);
    const cy = Math.max(by0 + rad - y, y - (by1 - rad), 0);
    if (cx * cx + cy * cy <= rad * rad) {
      const [rr, gg, bb] = barColor(i / (BARS.length - 1));
      const alpha = i === BARS.length - 1 ? 140 : 255;
      return [rr, gg, bb, alpha];
    }
  }
  return bg;
}

for (const size of [192, 512]) {
  fs.writeFileSync(`public/icon-${size}.png`, png(size, (x, y, s) => drawIcon(x, y, s)));
  console.log(`wrote public/icon-${size}.png`);
}
fs.writeFileSync('public/apple-touch-icon.png', png(180, (x, y, s) => drawIcon(x, y, s, { corner: 0 })));
console.log('wrote public/apple-touch-icon.png');
