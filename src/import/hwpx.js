// 한글 hwpx 읽기: 압축 파일 안의 Contents/section*.xml에서 문단·굵은 글자·제목 정보를 읽습니다.
import { unzipSync } from 'fflate';

const kids = (el, name) => [...el.childNodes].filter((n) => n.nodeType === 1 && (!name || n.localName === name));
const all = (el, name) => [...el.getElementsByTagNameNS('*', name)];

function parseHeader(xml) {
  const bold = new Set(); const height = {}; const outlinePara = new Set(); const styleName = {};
  if (!xml) return { bold, height, outlinePara, styleName, base: 1000 };
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  for (const c of all(doc, 'charPr')) {
    const id = c.getAttribute('id');
    if (all(c, 'bold').length) bold.add(id);
    height[id] = +c.getAttribute('height') || 1000;
  }
  for (const p of all(doc, 'paraPr')) {
    const hd = all(p, 'heading')[0];
    if (hd && /OUTLINE/i.test(hd.getAttribute('type') || '')) outlinePara.add(p.getAttribute('id'));
  }
  for (const s of all(doc, 'style')) styleName[s.getAttribute('id')] = `${s.getAttribute('name') || ''} ${s.getAttribute('engName') || ''}`;
  const hs = Object.values(height).sort((a, b) => a - b);
  return { bold, height, outlinePara, styleName, base: hs[Math.floor(hs.length / 2)] || 1000 };
}

function textOf(tEl) {
  let s = '';
  tEl.childNodes.forEach((n) => {
    if (n.nodeType === 3) s += n.nodeValue;
    else if (n.nodeType === 1) {
      if (n.localName === 'tab') s += ' ';
      else if (n.localName === 'lineBreak') s += '\n';
      else s += n.textContent || '';
    }
  });
  return s;
}

export async function readHwpx(buf) {
  const files = unzipSync(new Uint8Array(buf));
  const dec = new TextDecoder();
  const names = Object.keys(files);
  const headerName = names.find((n) => /header\.xml$/i.test(n));
  const hdr = parseHeader(headerName ? dec.decode(files[headerName]) : '');
  const sections = names.filter((n) => /section\d*\.xml$/i.test(n))
    .sort((a, b) => (+(a.match(/(\d+)\.xml$/i) || [0, 0])[1]) - (+(b.match(/(\d+)\.xml$/i) || [0, 0])[1]));
  if (!sections.length) throw new Error('hwpx 안에서 본문(section)을 찾지 못했습니다.');

  const blocks = [];
  const handleP = (p) => {
    const runs = []; const nested = [];
    let maxH = 0;
    for (const r of kids(p, 'run')) {
      const cid = r.getAttribute('charPrIDRef');
      const b = hdr.bold.has(cid);
      maxH = Math.max(maxH, hdr.height[cid] || hdr.base);
      for (const c of kids(r)) {
        if (c.localName === 't') { const t = textOf(c); if (t) runs.push({ t, b }); }
        else {
          // 표·글상자 안의 문단
          all(c, 'p').filter((q) => { let x = q.parentNode; while (x && x !== c) { if (x.localName === 'p') return false; x = x.parentNode; } return true; }).forEach((q) => nested.push(q));
        }
      }
    }
    const text = runs.map((r) => r.t).join('');
    const sname = hdr.styleName[p.getAttribute('styleIDRef')] || '';
    const isHead = text.trim() && text.trim().length < 80 && (
      hdr.outlinePara.has(p.getAttribute('paraPrIDRef')) || /개요|제목|Heading|Title|Outline/i.test(sname) || maxH >= hdr.base * 1.3);
    if (!text.trim()) blocks.push({ type: 'blank', runs: [] });
    else blocks.push({ type: isHead ? 'h' : 'p', runs: isHead ? runs.map((r) => ({ ...r, b: true })) : runs });
    nested.forEach(handleP);
  };
  for (const s of sections) {
    const doc = new DOMParser().parseFromString(dec.decode(files[s]), 'application/xml');
    const sec = doc.documentElement;
    kids(sec, 'p').forEach(handleP);
  }
  return blocks;
}
