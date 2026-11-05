// 카드 글은 "런" 배열로 저장합니다: [{ t: '글자', em: 강조, v: 성경 본문, h: 제목 }]
import { esc } from './ui.js';

export const STYLE_KEYS = ['em', 'v', 'h'];
const code = (r) => (r.em ? 1 : 0) | (r.v ? 2 : 0) | (r.h ? 4 : 0);
const fromCode = (c) => ({ ...(c & 1 ? { em: true } : {}), ...(c & 2 ? { v: true } : {}), ...(c & 4 ? { h: true } : {}) });

export const runsText = (runs) => runs.map((r) => r.t).join('');
export const charCount = (runs) => runsText(runs).replace(/\s/g, '').length;

// 글자 단위 배열로 펼치기(나누기 계산용)
export function flatten(runs) {
  let text = ''; const st = [];
  for (const r of runs) { text += r.t; const c = code(r); for (let i = 0; i < r.t.length; i++) st.push(c); }
  return { text, st };
}
export function unflatten(text, st, a = 0, b = text.length) {
  const out = []; let cur = null;
  for (let i = a; i < b; i++) {
    if (!cur || cur.c !== st[i]) { cur = { c: st[i], t: '' }; out.push(cur); }
    cur.t += text[i];
  }
  return out.map((x) => ({ t: x.t, ...fromCode(x.c) }));
}

export function normalize(runs) {
  const f = flatten(runs);
  return unflatten(f.text, f.st);
}
export const sliceRuns = (runs, a, b) => { const f = flatten(runs); return unflatten(f.text, f.st, a, b ?? f.text.length); };
export const concatRuns = (...lists) => normalize(lists.flat());

// 표시용 HTML. 앞쪽 공백과 끝쪽 공백은 화면에 보이지 않게 다듬습니다.
export function runsHTML(runs, { verse = true } = {}) {
  const f = flatten(runs);
  let a = 0, b = f.text.length;
  while (a < b && /\s/.test(f.text[a])) a++;
  while (b > a && /\s/.test(f.text[b - 1])) b--;
  return unflatten(f.text, f.st, a, b).map((r) => {
    const cls = [r.em && 'em', r.v && verse && 'v', r.h && 'hd'].filter(Boolean).join(' ');
    return cls ? `<span class="${cls}">${esc(r.t)}</span>` : esc(r.t);
  }).join('');
}

// 화면에 보이는 글자 위치(앞 공백 제외)를 원래 위치로 바꾸기
export function leadingSpace(runs) {
  const t = runsText(runs); let a = 0;
  while (a < t.length && /\s/.test(t[a])) a++;
  return a;
}

// 범위 [a,b)의 강조를 켜거나 끄기
export function toggleStyle(runs, a, b, key = 'em') {
  const f = flatten(runs);
  const bit = key === 'em' ? 1 : key === 'v' ? 2 : 4;
  const allOn = f.st.slice(a, b).every((c) => c & bit);
  for (let i = a; i < b; i++) f.st[i] = allOn ? f.st[i] & ~bit : f.st[i] | bit;
  return unflatten(f.text, f.st);
}
