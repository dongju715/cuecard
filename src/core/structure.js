// 가져온 글의 구조(제목, 번호, 빈 줄, 성경 구절)를 따라 카드를 나누고,
// 한 카드 분량을 넘으면 문장 단위로 이어서 나눕니다.
import { uid } from './storage.js';
import { normalize, runsText, charCount } from './runs.js';
import { createMeasurer, paginateRuns } from './paginate.js';

// 성경 구절 표시: "요 3:16", "요한복음 3장 16절", "(창 1:1-3)", "본문: 시편 23편 1~6절"
const BOOK = '(?:[1-3]\\s?)?[가-힣]{1,8}(?:서|기|복음|전서|후서|편|가|록)?';
export const VERSE_REF = new RegExp(`^\\s*(?:본문\\s*[:：]?\\s*)?[\\(\\[〈<]?\\s*${BOOK}\\s?\\d{1,3}\\s?(?:[:：]|장|편)\\s?\\d{1,3}(?:\\s?절)?(?:\\s?[-~–]\\s?\\d{1,3}(?:\\s?절)?)?`);
const NUMBERED = /^\s*(?:\d{1,2}[.)]\s|\(\d{1,2}\)\s?|[①-⑳]|[가나다라마바사아자차카타파하][.)]\s|(?:첫|둘|셋|넷|다섯|여섯|일곱|여덟|아홉|열)째[,\s]|[IVX]{1,4}\.\s)/;

const runsOf = (block) => block.runs.map((r) => ({ t: r.t, ...(r.b ? { em: true } : {}) }));

// blocks: [{ type: 'h'|'p'|'li'|'quote'|'blank', runs: [{t, b}] , ordered? }]
export function structureCards(blocks) {
  const cards = [];
  let cur = [];
  let inVerse = false;
  // 제목만 있는 카드는 끊지 않고 다음 내용과 함께 둡니다.
  const headingOnly = () => cur.length && cur.every((r) => r.h || !r.t.trim());
  const flush = (force) => {
    if (!force && headingOnly()) return;
    const r = normalize(cur);
    if (runsText(r).trim()) cards.push(r);
    cur = []; inVerse = false;
  };
  const add = (runs, mark = {}) => {
    if (cur.length) cur.push({ t: '\n' });
    runs.forEach((r) => cur.push({ ...r, ...mark }));
  };
  for (const b of blocks) {
    const text = b.runs.map((r) => r.t).join('');
    if (b.type === 'blank' || !text.trim()) { flush(); continue; }
    if (b.type === 'h') { flush(true); add(runsOf(b), { h: true }); continue; }
    if (b.type === 'quote') { if (!inVerse) flush(); add(runsOf(b), { v: true }); inVerse = true; continue; }
    if (VERSE_REF.test(text)) {
      flush(); add(runsOf(b), { v: true });
      inVerse = text.trim().length < 40; // 구절 제목만 있는 줄이면 다음 문단도 본문으로 봅니다
      if (!inVerse) flush();
      continue;
    }
    if (inVerse) { add(runsOf(b), { v: true }); continue; }
    if (b.ordered || NUMBERED.test(text)) { flush(); add(runsOf(b)); continue; }
    // 앞 카드가 제목뿐이면 그 아래로 이어 붙입니다.
    add(runsOf(b));
  }
  flush(true);
  return cards;
}

// 구조 나누기 + 분량 나누기를 합쳐 원고 카드 목록을 만듭니다.
export function makeCards(blocks) {
  const structural = structureCards(blocks);
  const m = createMeasurer();
  const out = [];
  try {
    for (const runs of structural) {
      paginateRuns(runs, m).forEach((p, i) => out.push({ id: uid(), runs: p, note: '', cont: i > 0 }));
    }
  } finally { m.destroy(); }
  return out;
}

export function blocksStats(blocks) {
  const runs = blocks.flatMap((b) => b.runs.map((r) => ({ t: r.t })));
  return { chars: charCount(runs) };
}

export function guessTitle(blocks, fallback = '새 원고') {
  const hd = blocks.find((b) => b.type === 'h' && b.runs.map((r) => r.t).join('').trim());
  const first = hd || blocks.find((b) => b.runs.map((r) => r.t).join('').trim());
  const t = first ? first.runs.map((r) => r.t).join('').trim() : '';
  return (t.length > 40 ? t.slice(0, 40) + '…' : t) || fallback;
}
