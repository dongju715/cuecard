// 일반 글(txt)과 마크다운 읽기. 줄바꿈은 문단, 빈 줄은 문단 구분으로 봅니다.
import { cleanBlocks } from './html.js';

function inlineMd(s) {
  const runs = [];
  const re = /(\*\*|__)(.+?)\1/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) runs.push({ t: s.slice(last, m.index), b: false });
    runs.push({ t: m[2], b: true });
    last = re.lastIndex;
  }
  if (last < s.length) runs.push({ t: s.slice(last), b: false });
  return runs.map((r) => ({ ...r, t: r.t.replace(/(^|[^*])\*([^*]+)\*/g, '$1$2').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') }));
}

export function textToBlocks(text) {
  const lines = text.replace(/\r\n?/g, '\n').replace(/ /g, ' ').split('\n');
  return cleanBlocks(lines.map((l) => (l.trim() ? { type: 'p', runs: [{ t: l, b: false }] } : { type: 'blank', runs: [] })));
}

export function markdownToBlocks(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let fence = false;
  for (const raw of lines) {
    if (/^```/.test(raw)) { fence = !fence; continue; }
    if (fence) { blocks.push({ type: 'p', runs: [{ t: raw, b: false }] }); continue; }
    const l = raw.trimEnd();
    if (!l.trim() || /^(-{3,}|\*{3,}|_{3,})$/.test(l.trim())) { blocks.push({ type: 'blank', runs: [] }); continue; }
    let m;
    if ((m = l.match(/^#{1,6}\s+(.*)$/))) blocks.push({ type: 'h', runs: inlineMd(m[1]).map((r) => ({ ...r, b: true })) });
    else if ((m = l.match(/^\s*>\s?(.*)$/))) blocks.push({ type: 'quote', runs: inlineMd(m[1]) });
    else if ((m = l.match(/^\s*(\d+)[.)]\s+(.*)$/))) blocks.push({ type: 'li', ordered: true, runs: [{ t: `${m[1]}. `, b: false }, ...inlineMd(m[2])] });
    else if ((m = l.match(/^\s*[-*+]\s+(.*)$/))) blocks.push({ type: 'li', runs: [{ t: '• ', b: false }, ...inlineMd(m[1])] });
    else blocks.push({ type: 'p', runs: inlineMd(l) });
  }
  return cleanBlocks(blocks);
}
