// 카드 나누기의 핵심. 실제 읽기 화면과 똑같은 모양의 보이지 않는 측정 상자에 글을 넣어
// 넘치는지 직접 재고, 문장이 끊기지 않는 자리를 골라 나눕니다.
import { flatten, unflatten, runsHTML, concatRuns, runsText } from './runs.js';
import { getSettings } from './settings.js';
import { h } from './ui.js';

// 읽기 화면과 같은 뼈대를 화면 밖에 만듭니다. 화면 크기, 안전 영역, 글자 설정이 모두 그대로 반영됩니다.
export function createMeasurer() {
  const s = getSettings();
  const body = h('div', { class: 'card-text' });
  const note = h('div', { class: 'card-note' });
  const root = h('div', { class: 'reader measuring', 'aria-hidden': 'true' },
    h('div', { class: 'card' },
      h('div', { class: 'card-top' }, h('span', { class: 'timer' }, '00:00')),
      h('div', { class: 'card-body' }, body, note),
      h('div', { class: 'card-bottom' + (s.showProgress || s.showCardNumber ? '' : ' empty') }, h('span', { class: 'count' }, '1 / 1'))));
  document.body.append(root);
  const box = root.querySelector('.card-body');
  const verse = !!s.verseHighlight;
  return {
    fits(runs, noteText = '') {
      body.innerHTML = runsHTML(runs, { verse });
      note.textContent = noteText; note.style.display = noteText ? '' : 'none';
      return box.scrollHeight <= box.clientHeight + 1;
    },
    destroy() { root.remove(); },
  };
}

const SENT_END = /[.?!。…"”’」』)\]]/;
const CONNECT = /(고|며|서|는데|지만|면서|면|니까|으니|어서|아서|도록|듯이|거나|든지|요|죠)[,]?$/;

// 위치 i(앞 글자와 i번째 글자 사이)에서 끊을 때의 자연스러움 점수
function score(text, st, i) {
  const prev = text[i - 1], next = text[i];
  const inVerse = (st[i - 1] & 2) && (st[i] & 2);
  if (prev === '\n') return 5;
  if (inVerse) {
    // 성경 본문 안에서는 절 번호 앞에서만 끊습니다.
    if (/\d/.test(next) && /\s/.test(prev) && /^\d{1,3}\s/.test(text.slice(i, i + 4))) return 3;
    return -10;
  }
  if (!/\s/.test(prev)) return -20; // 단어 중간
  const before = text.slice(Math.max(0, i - 12), i).trimEnd();
  if (SENT_END.test(before.slice(-1))) return 4;
  if (/[,;:·]$/.test(before)) return 2.5;
  const word = before.split(/\s/).pop() || '';
  if (CONNECT.test(word)) return 2;
  return 1;
}

// 런 배열을 화면에 맞는 여러 장으로 나눕니다.
export function paginateRuns(runs, measurer, noteText = '') {
  const { text, st } = flatten(runs);
  const n = text.length;
  const pages = [];
  let s = 0;
  let guard = 0;
  while (s < n && guard++ < 5000) {
    const rest = unflatten(text, st, s, n);
    const note = pages.length === 0 ? noteText : '';
    if (!runsText(rest).trim()) break;
    if (measurer.fits(rest, note)) { pages.push(rest); break; }
    // 공백·줄바꿈 바로 뒤 자리들이 후보입니다.
    const cands = [];
    for (let i = s + 1; i < n; i++) if (/\s/.test(text[i - 1]) && !/\s/.test(text[i])) cands.push(i);
    // 들어가는 가장 먼 후보를 이분 탐색으로 찾습니다.
    let lo = 0, hi = cands.length - 1, best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (measurer.fits(unflatten(text, st, s, cands[mid]), note)) { best = mid; lo = mid + 1; } else hi = mid - 1;
    }
    let end;
    if (best < 0) {
      // 한 단어도 안 들어갈 만큼 긴 경우: 글자 단위로 자릅니다(아주 드묾).
      let a = s + 1, b = n;
      while (a < b) { const m = (a + b + 1) >> 1; if (measurer.fits(unflatten(text, st, s, m), note)) a = m; else b = m - 1; }
      end = Math.max(a, s + 1);
    } else {
      const far = cands[best];
      const minPos = s + (far - s) * 0.45;
      let pick = far, pickScore = -Infinity;
      for (let k = best; k >= 0 && cands[k] >= minPos; k--) {
        const sc = score(text, st, cands[k]) + (cands[k] - s) / (far - s) * 0.6; // 같은 점수면 더 많이 담는 쪽
        if (sc > pickScore) { pickScore = sc; pick = cands[k]; }
      }
      end = pick;
    }
    pages.push(unflatten(text, st, s, end));
    s = end;
  }
  return pages.length ? pages : [runs];
}

// 원고 카드들을 읽기용 묶음으로: 자동으로 이어진 카드(cont)는 앞 카드와 합쳐 다시 나눕니다.
export function groupCards(cards) {
  const groups = [];
  for (const c of cards) {
    if (c.cont && groups.length) { const g = groups[groups.length - 1]; g.cards.push(c); g.runs = concatRuns(g.runs, c.runs); if (c.note) g.note = [g.note, c.note].filter(Boolean).join(' · '); }
    else groups.push({ id: c.id, cards: [c], runs: c.runs.slice(), note: c.note || '' });
  }
  return groups;
}

// 읽기 화면용 페이지 목록 만들기
export function buildPages(cards, showNotes = true) {
  const m = createMeasurer();
  const pages = [];
  try {
    for (const g of groupCards(cards)) {
      const parts = paginateRuns(g.runs, m, showNotes ? g.note : '');
      let off = 0;
      parts.forEach((p, i) => {
        const len = runsText(p).length;
        pages.push({ groupId: g.id, start: off, end: off + len, runs: p, note: i === 0 && showNotes ? g.note : '', part: i, parts: parts.length });
        off += len;
      });
    }
  } finally { m.destroy(); }
  return pages;
}
