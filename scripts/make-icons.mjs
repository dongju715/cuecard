// 앱 아이콘 PNG 만들기(라이브러리 없이). 로고 C1(넘길 다음 장 + 큐 마크). 실행: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const PAPER = [0xf4, 0xef, 0xe6], INK = [0x0e, 0x0e, 0x0e], ORANGE = [0xf2, 0x61, 0x35];
// 240 칸 기준 도형: [종류, ...값, 색, 회전]
const SHAPES = (small) => [
  ['rr', 70, 40, 112, 140, 14, ORANGE, 8],
  ['rr', 58, 54, 112, 140, 14, INK, 0],
  ['c', 148, 76, small ? 12 : 9, ORANGE],
  ...(small ? [['rr', 76, 140, 76, 10, 5, PAPER, 0]] : [['rr', 76, 136, 76, 7, 3.5, PAPER, 0], ['rr', 76, 154, 46, 7, 3.5, PAPER.map((v, i) => (v + INK[i]) / 2), 0]]),
];
const rrDist = (x, y, x0, y0, w, h, r) => { const cx = x0 + w / 2, cy = y0 + h / 2; const qx = Math.abs(x - cx) - w / 2 + r, qy = Math.abs(y - cy) - h / 2 + r; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
function png(S, scale) {
  const px = Buffer.alloc(S * (S * 4 + 1));
  const shapes = SHAPES(S < 100);
  const u = 240 / S / scale; // 픽셀 하나가 240 칸에서 차지하는 크기
  for (let y = 0; y < S; y++) {
    px[y * (S * 4 + 1)] = 0;
    for (let x = 0; x < S; x++) {
      // 240 칸 좌표로 바꾸고 구성 중심(124,115)을 가운데로
      const X = (x + 0.5 - S / 2) * u + 124, Y = (y + 0.5 - S / 2) * u + 117;
      let col = PAPER.slice();
      for (const sh of shapes) {
        let d;
        if (sh[0] === 'c') d = Math.hypot(X - sh[1], Y - sh[2]) - sh[3];
        else {
          const [, x0, y0, w, h, r, , rot] = sh; let px2 = X, py2 = Y;
          if (rot) { const a = -rot * Math.PI / 180, cx = 126, cy = 110, dx = X - cx, dy = Y - cy; px2 = cx + dx * Math.cos(a) - dy * Math.sin(a); py2 = cy + dx * Math.sin(a) + dy * Math.cos(a); }
          d = rrDist(px2, py2, x0, y0, w, h, r);
        }
        const a = Math.max(0, Math.min(1, 0.5 - d / u));
        const c = sh[0] === 'c' ? sh[4] : sh[6];
        if (a > 0) col = col.map((v, i) => v * (1 - a) + c[i] * a);
      }
      const o = y * (S * 4 + 1) + 1 + x * 4;
      px[o] = col[0]; px[o + 1] = col[1]; px[o + 2] = col[2]; px[o + 3] = 255;
    }
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(S, 0); ih.writeUInt32BE(S, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(px)), chunk('IEND', Buffer.alloc(0))]);
}
writeFileSync('public/icons/icon-192.png', png(192, 1.05));
writeFileSync('public/icons/icon-512.png', png(512, 1.05));
writeFileSync('public/icons/icon-maskable-512.png', png(512, 0.85));
writeFileSync('public/icons/apple-touch-icon.png', png(180, 1.05));
