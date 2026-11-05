// pdf 읽기: 글자가 들어 있는 pdf만 지원합니다. 스캔본이면 안내합니다.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import { ImportError } from './index.js';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function readPdf(buf) {
  const base = new URL('./', document.baseURI).href;
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(buf),
    cMapUrl: base + 'pdfjs/cmaps/', cMapPacked: true,
    standardFontDataUrl: base + 'pdfjs/standard_fonts/',
    isEvalSupported: false, disableFontFace: true, useSystemFonts: false,
  }).promise;
  const blocks = [];
  let chars = 0;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const tc = await page.getTextContent();
    const fonts = tc.styles || {};
    // 같은 높이의 글자를 한 줄로 묶습니다.
    const lines = [];
    for (const it of tc.items) {
      if (!('str' in it)) continue;
      const y = Math.round(it.transform[5]);
      const size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
      let line = lines.find((l) => Math.abs(l.y - y) < size * 0.5);
      if (!line) { line = { y, size, parts: [] }; lines.push(line); }
      const bold = /bold|black|heavy|semibold/i.test((fonts[it.fontName] || {}).fontFamily || '') || /bold/i.test(it.fontName);
      line.parts.push({ x: it.transform[4], t: it.str, b: bold, w: it.width });
      line.size = Math.max(line.size, size);
    }
    lines.sort((a, b) => b.y - a.y);
    const sizes = lines.map((l) => l.size).sort((a, b) => a - b);
    const body = sizes[Math.floor(sizes.length / 2)] || 10;
    let prevY = null;
    for (const l of lines) {
      l.parts.sort((a, b) => a.x - b.x);
      const runs = [];
      let lastEnd = null;
      for (const p of l.parts) {
        const gap = lastEnd != null && p.x - lastEnd > body * 0.25 && !/^\s/.test(p.t) ? ' ' : '';
        runs.push({ t: gap + p.t, b: p.b });
        lastEnd = p.x + (p.w || 0);
      }
      const text = runs.map((r) => r.t).join('').trim();
      if (!text) continue;
      chars += text.length;
      if (prevY != null && prevY - l.y > l.size * 1.9) blocks.push({ type: 'blank', runs: [] });
      const isHead = l.size >= body * 1.25 && text.length < 60;
      blocks.push({ type: isHead ? 'h' : 'p', runs: isHead ? runs.map((r) => ({ ...r, b: true })) : runs });
      prevY = l.y;
    }
    blocks.push({ type: 'blank', runs: [] });
  }
  if (chars < Math.max(20, pdf.numPages * 10)) throw new ImportError('scanned', '글자가 들어 있지 않은 pdf입니다.');
  // pdf는 줄마다 끊기므로, 문장이 이어지는 줄은 한 문단으로 합칩니다.
  const merged = [];
  for (const b of blocks) {
    const prev = merged[merged.length - 1];
    const prevText = prev ? prev.runs.map((r) => r.t).join('') : '';
    if (b.type === 'p' && prev && prev.type === 'p' && !/[.?!。…"”:]$/.test(prevText.trim())) {
      prev.runs.push({ t: /[가-힣]$/.test(prevText) ? ' ' : ' ', b: false }, ...b.runs);
    } else merged.push(b);
  }
  return merged;
}
