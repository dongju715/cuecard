// 보관함(첫 화면): 원고 목록, 검색, 용도별 거르기, 이름 변경·복제·내보내기·삭제
import { h, sheet, toast, confirmSheet, promptSheet, fmtDate } from '../core/ui.js';
import { listManuscripts, saveManuscript, deleteManuscript, uid } from '../core/storage.js';
import { exportOne, newManuscript } from '../core/backup.js';
import { PURPOSES, purposeLabel } from '../data/presets.js';
import { logoMark } from '../core/logo.js';
import { getSettings } from '../core/settings.js';

const GREET = { sermon: '오늘도 좋은 말씀 되세요.', lecture: '오늘 강의도 잘 풀리길 바랍니다.', present: '자신 있게, 차분하게 발표하세요.', speech: '마음이 잘 전해지길 바랍니다.', reading: '천천히, 또렷하게 읽어 보세요.' };
const DAY = 86400000;
// 저장된 읽던 위치로 몇 번째 카드인지 셈 (자동 이어짐 카드는 한 묶음)
function progressOf(m) {
  const n = m.cards.length || 1;
  const i = m.cards.findIndex((c) => c.id === m.position?.cardId);
  return { at: i < 0 ? 0 : i + 1, n, ratio: i < 0 ? 0 : (i + 1) / n };
}
const ago = (t) => { const d = Math.floor((Date.now() - t) / DAY); return d <= 0 ? '오늘' : d === 1 ? '어제' : d < 7 ? `${d}일 전` : fmtDate(t); };

const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export default async function library(root) {
  let all = await listManuscripts();
  let q = '';
  let filter = 'all';
  const listEl = h('div', {});
  const search = h('input', { class: 'input', type: 'search', placeholder: '원고 검색', 'aria-label': '원고 검색', oninput: (e) => { q = e.target.value.trim(); draw(); } });
  const chips = h('div', { class: 'chips' });

  function drawChips() {
    const used = new Set(all.map((m) => m.purpose));
    chips.innerHTML = '';
    [{ id: 'all', label: '전체' }, ...PURPOSES.filter((p) => used.has(p.id))].forEach((p) =>
      chips.append(h('button', { class: 'chip' + (filter === p.id ? ' on' : ''), onclick: () => { filter = p.id; drawChips(); draw(); } }, p.label)));
  }

  function draw() {
    const items = all.filter((m) => (filter === 'all' || m.purpose === filter) && (!q || m.title.toLowerCase().includes(q.toLowerCase())));
    listEl.innerHTML = '';
    if (!all.length) {
      listEl.append(h('div', { class: 'empty-state' }, h('div', { class: 'big-icon' }), h('p', {}, '아직 원고가 없습니다.'), h('p', { class: 'small' }, '위의 “파일 가져오기”나 “붙여넣기”로 hwpx·docx·pdf·txt 파일이나 복사한 글을 넣어 보세요.')));
      return;
    }
    if (!items.length) { listEl.append(h('p', { class: 'muted', style: { textAlign: 'center', padding: '24px' } }, '찾는 원고가 없습니다.')); return; }
    listEl.append(h('div', { class: 'doc-grid' }, items.map((m) => {
      const p = progressOf(m);
      return h('div', { class: 'doc' },
        h('button', { class: 'doc-main', onclick: () => { location.hash = `#/read/${m.id}`; } },
          h('div', { class: 'doc-title' }, m.title),
          h('div', { class: 'doc-meta' }, `${purposeLabel(m.purpose)} · ${m.cards.length}장 · ${m.lastOpened ? ago(m.lastOpened) : '새 원고'}`),
          h('div', { class: 'bar' }, h('i', { style: { width: `${Math.round(p.ratio * 100)}%` } }))),
        h('div', { class: 'doc-actions' },
          h('button', { class: 'btn small', onclick: () => { location.hash = `#/edit/${m.id}`; } }, '편집'),
          h('button', { class: 'icon-btn', 'aria-label': '더 보기', onclick: () => more(m) }, '⋯')));
    })));
  }

  function more(m) {
    const ref = sheet(m.title, h('div', { class: 'choices list' },
      h('button', { class: 'btn big', onclick: async () => { ref.close(); const t = await promptSheet('이름 바꾸기', m.title); if (t) { m.title = t; await saveManuscript(m); draw(); } } }, '이름 바꾸기'),
      h('button', { class: 'btn big', onclick: async () => {
        ref.close();
        const sel = h('select', { class: 'input' }, PURPOSES.map((p) => h('option', { value: p.id, selected: p.id === m.purpose || null }, p.label)));
        sheet('용도 바꾸기', sel, { actions: [{ label: '저장', kind: 'primary', run: async () => { m.purpose = sel.value; await saveManuscript(m); drawChips(); draw(); } }] });
      } }, '용도 바꾸기'),
      h('button', { class: 'btn big', onclick: async () => {
        ref.close();
        const copy = JSON.parse(JSON.stringify(m));
        Object.assign(copy, { id: uid(), title: m.title + ' (복사본)', createdAt: Date.now(), lastOpened: null, position: { cardId: null, offset: 0 } });
        if (await saveManuscript(copy)) { all = await listManuscripts(); draw(); toast('복제했습니다.'); }
      } }, '복제'),
      h('button', { class: 'btn big', onclick: () => { ref.close(); exportOne(m.id); } }, '내보내기 (다른 사람에게 보내기)'),
      h('button', { class: 'btn big danger', onclick: async () => {
        ref.close();
        if (await confirmSheet('원고 삭제', `“${m.title}”을(를) 지울까요? 되돌릴 수 없습니다.`, '삭제')) { await deleteManuscript(m.id); all = await listManuscripts(); drawChips(); draw(); }
      } }, '삭제')));
  }

  const st = getSettings();
  const recent = all.filter((m) => m.lastOpened).sort((a, b) => b.lastOpened - a.lastOpened)[0];
  const week = all.filter((m) => m.lastOpened && Date.now() - m.lastOpened < 7 * DAY).length;
  const totalCards = all.reduce((n, m) => n + m.cards.length, 0);

  async function newBlank() {
    const m = newManuscript([], '새 원고');
    m.cards = [{ id: uid(), runs: [{ t: '' }], note: '', cont: false }];
    if (await saveManuscript(m)) location.hash = `#/edit/${m.id}`;
  }

  let hero = null;
  if (recent) {
    const p = progressOf(recent);
    hero = h('button', { class: 'hero', onclick: () => { location.hash = `#/read/${recent.id}`; } },
      h('div', { class: 'hero-eyebrow' }, `이어서 읽기 · ${ago(recent.lastOpened)}`),
      h('div', { class: 'hero-title' }, recent.title),
      h('div', { class: 'bar' }, h('i', { style: { width: `${Math.round(p.ratio * 100)}%` } })),
      h('div', { class: 'hero-foot' }, h('span', {}, `${p.at} / ${p.n}장`), h('span', { class: 'hero-go' }, '▶ 이어서 읽기')));
  }
  const tile = (icon, label, run) => h('button', { class: 'tile', onclick: run }, h('span', { class: 'tile-ic', 'aria-hidden': 'true' }, icon), label);
  const stat = (label, v) => h('div', { class: 'stat' }, h('span', { class: 'muted small' }, label), h('b', {}, v));

  root.append(h('div', { class: 'screen library' },
    h('header', { class: 'topbar brand' },
      h('div', { class: 'brand-mark', html: logoMark({ size: 32 }) }),
      h('h1', {}, '큐카드'),
      h('button', { class: 'btn small', onclick: () => { location.hash = '#/settings'; } }, '설정')),
    h('main', {},
      h('p', { class: 'greet' }, GREET[st.purpose] || '오늘도 잘 전하시길 바랍니다.'),
      !isStandalone() ? h('button', { class: 'notice warn', style: { width: '100%', textAlign: 'left', border: 0 }, onclick: () => installGuide() }, '홈 화면에 추가해서 쓰면 전체 화면으로 열리고, 오래 쓰지 않아도 저장한 원고가 지워질 위험이 줄어듭니다. 방법 보기 ›') : null,
      hero,
      h('div', { class: 'tiles' },
        tile('⇪', '파일 가져오기', () => { location.hash = '#/import'; }),
        tile('⎘', '붙여넣기', () => { location.hash = '#/import'; }),
        tile('✎', '새로 쓰기', newBlank)),
      all.length ? h('div', { class: 'stats' }, stat('원고', `${all.length}`), stat('전체 카드', `${totalCards}`), stat('이번 주 읽음', `${week}개`)) : null,
      h('div', { class: 'section-head' }, h('h2', {}, '원고'), search),
      chips, listEl,
      h('div', { class: 'credit' }, 'LIGHTUP MEDIA.'))));
  drawChips(); draw();
}

export function installGuide() {
  sheet('홈 화면에 추가하기', h('div', {},
    h('h3', {}, 'iPad · Safari'),
    h('ol', { class: 'steps' }, h('li', {}, '주소창 옆의 공유 버튼(□↑)을 누릅니다.'), h('li', {}, '“홈 화면에 추가”를 고릅니다.'), h('li', {}, '이름을 “큐카드”로 두고 “추가”를 누릅니다.'), h('li', {}, '이제 홈 화면의 큐카드 아이콘으로 엽니다.')),
    h('h3', {}, 'Galaxy Tab · Chrome'),
    h('ol', { class: 'steps' }, h('li', {}, '오른쪽 위 ⋮ 메뉴를 누릅니다.'), h('li', {}, '“홈 화면에 추가” 또는 “앱 설치”를 고릅니다.'), h('li', {}, '“설치”를 누르면 홈 화면에 아이콘이 생깁니다.')),
    h('p', { class: 'notice' }, 'Safari는 오래 쓰지 않은 웹사이트의 저장 데이터를 지울 수 있습니다. 홈 화면에 추가해 두고, 설정 → 백업 내보내기로 가끔 백업 파일을 만들어 두세요.')));
}
