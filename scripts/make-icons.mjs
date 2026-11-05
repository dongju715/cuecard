// 앱 아이콘 PNG 만들기(라이브러리 없이). 실행: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(size, pad) {
  const S = size, px = Buffer.alloc(S * (S * 4 + 1));
  const bg = [0x14, 0x16, 0x1b], card = [0xf3, 0xef, 0xe6], line = [0xb9, 0xb2, 0xa4], acc = [0xd9, 0xa6, 0x5a];
  const k = (S / 512) * pad;
  const rr = (x, y, x0, y0, w, h, r) => { // 둥근 사각형 안쪽 정도(0~1)
    const cx = Math.max(x0 + r, Math.min(x, x0 + w - r)), cy = Math.max(y0 + r, Math.min(y, y0 + h - r));
    return Math.max(0, Math.min(1, r - Math.hypot(x - cx, y - cy) + 0.5));
  };
  const c0 = S / 2;
  const T = (v) => c0 + (v - 256) * (S / 512) * k;
  const shapes = [[136, 96, 240, 320, 34, card], [172, 168, 168, 16, 8, line], [172, 208, 140, 16, 8, line], [172, 248, 156, 16, 8, acc]];
  for (let y = 0; y < S; y++) {
    px[y * (S * 4 + 1)] = 0;
    for (let x = 0; x < S; x++) {
      let col = bg.slice();
      for (const [x0, y0, w, h, r, c] of shapes) {
        const a = rr(x + 0.5, y + 0.5, T(x0), T(y0), w * (S / 512) * k, h * (S / 512) * k, r * (S / 512) * k);
        if (a > 0) col = col.map((v, i) => v * (1 - a) + c[i] * a);
      }
      const o = y * (S * 4 + 1) + 1 + x * 4;
      px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
    }
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(S, 0); ih.writeUInt32BE(S, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(px)), chunk('IEND', Buffer.alloc(0))]);
}
writeFileSync('public/icons/icon-192.png', png(192, 1));
writeFileSync('public/icons/icon-512.png', png(512, 1));
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.78));
writeFileSync('public/icons/apple-touch-icon.png', png(180, 1));
