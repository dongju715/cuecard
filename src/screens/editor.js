// 카드 편집: 합치기, 쪼개기, 순서 바꾸기, 삭제, 추가, 글 고치기, 강조, 메모
import { h, toast, confirmSheet, promptSheet } from '../core/ui.js';
import { getManuscript, saveManuscript, uid } from '../core/storage.js';
import { getSettings } from '../core/settings.js';
import { runsHTML, concatRuns, sliceRuns, toggleStyle, runsText, leadingSpace } from '../core/runs.js';
import { makeCards } from '../core/structure.js';

// 편집 칸의 DOM을 런 배열로 되돌립니다.
function domToRuns(el) {
  const out = [];
  const walk = (n, st) => {
    if (n.nodeType === 3) { if (n.nodeValue) out.push({ t: n.nodeValue.replace(/ /g, ' '), ...st }); return; }
    if (n.nodeType !== 1) return;
    if (n.tagName === 'BR') { out.push({ t: '\n', ...st }); return; }
    const c = n.classList;
    const s2 = { ...st };
    if (c.contains('em') || /^(B|STRONG)$/.test(n.tagName) || /font-weight:\s*(bold|[6-9]00)/.test(n.getAttribute('style') || '')) s2.em = true;
    if (c.contains('v')) s2.v = true;
    if (c.contains('hd')) s2.h = true;
    if ((n.tagName === 'DIV' || n.tagName === 'P') && out.length && !/\n$/.test(out[out.length - 1].t)) out.push({ t: '\n' });
    n.childNodes.forEach((k) => walk(k, s2));
  };
  el.childNodes.forEach((k) => walk(k, {}));
  return concatRuns(out);
}

function textOffset(container, node, off) {
  const r = document.createRange();
  r.setStart(container, 0);
  try { r.setEnd(node, off); } catch { return 0; }
  return r.toString().length;
}

export default async function editor(root, id) {
  const m = await getManuscript(id);
  if (!m) { location.hash = '#/home'; return; }
  const s = getSettings();
  let selected = 0;
  let splitMode = false;
  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => saveManuscript(m), 350); };
  const list = h('div', {});

  // 화면에 보이는 위치 → 저장된 위치 (앞쪽 공백 보정)
  const visToRaw = (card, v) => v + leadingSpace(card.runs);

  function draw(focusIdx) {
    list.innerHTML = '';
    m.cards.forEach((c, i) => {
      const text = h('div', { class: 'card-edit', contenteditable: splitMode ? 'false' : 'true', spellcheck: 'false', html: runsHTML(c.runs, { verse: true }) });
      text.addEventListener('input', () => { c.runs = concatRuns(new Array(leadingSpace(c.runs)).fill(0).map(() => ({ t: ' ' })), domToRuns(text)); save(); });
      text.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.execCommand('insertText', false, '\n'); } });
      text.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); });
      text.addEventListener('click', (e) => {
        selected = i; mark();
        if (!splitMode) return;
        let node, off;
        if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(e.clientX, e.clientY); if (r) { node = r.startContainer; off = r.startOffset; } }
        else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(e.clientX, e.clientY); if (p) { node = p.offsetNode; off = p.offset; } }
        if (!node) return;
        splitAt(i, visToRaw(c, textOffset(text, node, off)));
      });
      const note = h('input', { class: 'input note-input', placeholder: '메모 (읽기 화면 카드 아래에 작게 보입니다)', value: c.note || '' });
      note.addEventListener('input', () => { c.note = note.value; save(); });
      const card = h('section', { class: 'edit-card' + (splitMode ? ' splitting' : '') + (i === selected ? ' selected' : ''), 'data-i': i, onfocusin: () => { selected = i; mark(); } },
        h('div', { class: 'edit-head' },
          h('span', { class: 'n' }, `${i + 1}`, c.cont ? h('span', { class: 'cont' }, '· 앞 카드와 이어짐(화면에 맞춰 자동 조정)') : null),
          h('button', { class: 'icon-btn', 'aria-label': '위로', disabled: i === 0 || null, onclick: () => move(i, -1) }, '↑'),
          h('button', { class: 'icon-btn', 'aria-label': '아래로', disabled: i === m.cards.length - 1 || null, onclick: () => move(i, 1) }, '↓'),
          h('button', { class: 'icon-btn', 'aria-label': '다음 카드와 합치기', title: '다음 카드와 합치기', disabled: i === m.cards.length - 1 || null, onclick: () => merge(i) }, '⤓'),
          h('button', { class: 'icon-btn', 'aria-label': '삭제', onclick: () => remove(i) }, '🗑')),
        text, note);
      list.append(card);
    });
    if (focusIdx != null) list.children[focusIdx]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    countEl.textContent = `카드 ${m.cards.length}장`;
  }
  const mark = () => [...list.children].forEach((el, i) => el.classList.toggle('selected', i === selected));

  function move(i, d) {
    const j = i + d; [m.cards[i], m.cards[j]] = [m.cards[j], m.cards[i]];
    // 순서를 직접 바꾼 카드는 자동 이어짐을 풉니다.
    m.cards[i].cont = false; m.cards[j].cont = false; if (m.cards[j + 1]) m.cards[j + 1].cont = false; if (m.cards[i + 1]) m.cards[i + 1].cont = false;
    selected = j; save(); draw(j);
  }
  function merge(i) {
    const a = m.cards[i], b = m.cards[i + 1];
    a.runs = b.cont ? concatRuns(a.runs, b.runs) : concatRuns(a.runs, [{ t: '\n' }], b.runs);
    a.note = [a.note, b.note].filter(Boolean).join(' · ');
    m.cards.splice(i + 1, 1);
    save(); draw(i); toast('두 카드를 합쳤습니다.');
  }
  async function remove(i) {
    if (runsText(m.cards[i].runs).trim() && !(await confirmSheet('카드 삭제', '이 카드를 지울까요? 원본 글은 남아 있어서 “처음부터 다시 나누기”로 되살릴 수 있습니다.', '삭제'))) return;
    m.cards.splice(i, 1);
    if (m.cards[i]) m.cards[i].cont = false;
    if (!m.cards.length) m.cards.push({ id: uid(), runs: [{ t: '' }], note: '', cont: false });
    selected = Math.max(0, i - 1); save(); draw();
  }
  function splitAt(i, off) {
    const c = m.cards[i];
    const full = runsText(c.runs);
    const len = full.length;
    // 단어 중간을 눌렀으면 가장 가까운 띄어쓰기 자리로 옮깁니다.
    if (/\S/.test(full[off - 1] || '') && /\S/.test(full[off] || '')) {
      let l = off, r = off;
      while (l > 0 && /\S/.test(full[l - 1])) l--;
      while (r < len && /\S/.test(full[r])) r++;
      off = off - l <= r - off ? l : r;
    }
    if (off <= 0 || off >= len) return toast('글 가운데를 눌러 주세요.');
    const a = sliceRuns(c.runs, 0, off), b = sliceRuns(c.runs, off);
    m.cards.splice(i, 1, { ...c, runs: a }, { id: uid(), runs: b, note: '', cont: false });
    splitMode = false; toolSplit.classList.remove('primary');
    selected = i + 1; save(); draw(i + 1); toast('그 자리에서 나눴습니다.');
  }
  function add() {
    const at = Math.min(selected + 1, m.cards.length);
    m.cards.splice(at, 0, { id: uid(), runs: [{ t: '' }], note: '', cont: false });
    if (m.cards[at + 1]) m.cards[at + 1].cont = false;
    selected = at; save(); draw(at);
    setTimeout(() => list.children[at]?.querySelector('.card-edit')?.focus(), 300);
  }
  // 고른 단어·문장의 강조 켜고 끄기
  let lastSel = null;
  const onSel = () => {
    const sel = getSelection();
    if (!sel.rangeCount || sel.isCollapsed) return;
    const r = sel.getRangeAt(0);
    const box = r.startContainer.parentElement?.closest('.card-edit');
    if (box && box.contains(r.endContainer)) lastSel = { box, a: textOffset(box, r.startContainer, r.startOffset), b: textOffset(box, r.endContainer, r.endOffset) };
  };
  document.addEventListener('selectionchange', onSel);
  function emphasize(key) {
    if (!lastSel || !lastSel.box.isConnected) return toast('먼저 강조할 단어나 문장을 길게 눌러 고르세요.');
    const i = +lastSel.box.closest('.edit-card').dataset.i;
    const c = m.cards[i];
    c.runs = toggleStyle(c.runs, visToRaw(c, lastSel.a), visToRaw(c, lastSel.b), key);
    lastSel = null; getSelection().removeAllRanges();
    save(); draw();
  }
  async function resplit() {
    if (!(await confirmSheet('처음부터 다시 나누기', '보관해 둔 원본 글로 카드를 다시 나눕니다. 지금까지 고친 내용과 메모는 사라집니다.', '다시 나누기'))) return;
    m.cards = makeCards(m.source || []);
    m.position = { cardId: null, offset: 0 };
    save(); draw(0); toast('원본 글로 다시 나눴습니다.');
  }

  const countEl = h('span', { class: 'muted small' });
  const keep = (b) => { b.addEventListener('pointerdown', (e) => e.preventDefault()); return b; };
  const toolSplit = keep(h('button', { class: 'btn', onclick: () => { splitMode = !splitMode; toolSplit.classList.toggle('primary', splitMode); draw(); if (splitMode) toast('나눌 자리를 누르세요.'); } }, '✂ 쪼개기'));
  const titleEl = h('h1', {}, m.title);

  root.append(h('div', { class: 'screen editor' },
    h('header', { class: 'topbar' },
      h('button', { class: 'btn ghost', onclick: () => { location.hash = '#/home'; } }, '‹ 보관함'),
      titleEl,
      h('button', { class: 'btn small', onclick: async () => { const t = await promptSheet('제목 바꾸기', m.title); if (t) { m.title = t; titleEl.textContent = t; save(); } } }, '제목')),
    h('main', {},
      h('p', { class: 'notice warn' }, '여기서 고친 내용은 원본 파일이 아니라 이 앱 안의 원고에만 반영됩니다. 원본 글은 따로 보관되어 언제든 처음부터 다시 나눌 수 있습니다.'),
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, countEl,
        h('button', { class: 'btn small ghost', onclick: resplit }, '처음부터 다시 나누기')),
      list),
    h('div', { class: 'edit-tools' },
      keep(h('button', { class: 'btn', onclick: () => emphasize('em') }, h('b', {}, '강조'), ' 켜기/끄기')),
      s.verseHighlight || true ? keep(h('button', { class: 'btn', onclick: () => emphasize('v') }, '성경 본문 표시')) : null,
      toolSplit,
      keep(h('button', { class: 'btn', onclick: add }, '＋ 새 카드')),
      h('button', { class: 'btn primary', onclick: async () => { clearTimeout(saveT); await saveManuscript(m); location.hash = `#/read/${m.id}`; } }, '읽기 ▶'))));
  draw();
  return () => { document.removeEventListener('selectionchange', onSel); clearTimeout(saveT); saveManuscript(m, { quiet: true }); };
}
