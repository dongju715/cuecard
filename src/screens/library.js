// 보관함(첫 화면): 원고 목록, 검색, 용도별 거르기, 이름 변경·복제·내보내기·삭제
import { h, sheet, toast, confirmSheet, promptSheet, fmtDate } from '../core/ui.js';
import { listManuscripts, saveManuscript, deleteManuscript, uid } from '../core/storage.js';
import { exportOne } from '../core/backup.js';
import { PURPOSES, purposeLabel } from '../data/presets.js';

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
      listEl.append(h('div', { class: 'empty-state' }, h('div', { class: 'big-icon' }), h('p', {}, '아직 원고가 없습니다.'), h('p', { class: 'small' }, '아래 “원고 가져오기”로 hwpx·docx·pdf·txt 파일이나 복사한 글을 넣어 보세요.')));
      return;
    }
    if (!items.length) { listEl.append(h('p', { class: 'muted', style: { textAlign: 'center', padding: '24px' } }, '찾는 원고가 없습니다.')); return; }
    listEl.append(h('div', { class: 'card-list' }, items.map((m) => h('div', { class: 'item' },
      h('button', { class: 'main', onclick: () => { location.hash = `#/read/${m.id}`; } },
        h('div', { class: 'title' }, m.title),
        h('div', { class: 'meta' }, `${purposeLabel(m.purpose)} · 카드 ${m.cards.length}장 · ${m.lastOpened ? '마지막으로 연 날 ' + fmtDate(m.lastOpened) : '아직 열지 않음'}`)),
      h('button', { class: 'btn small', onclick: () => { location.hash = `#/edit/${m.id}`; } }, '편집'),
      h('button', { class: 'icon-btn', 'aria-label': '더 보기', onclick: () => more(m) }, '⋯')))));
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

  root.append(h('div', { class: 'screen library' },
    h('header', { class: 'topbar' }, h('h1', {}, '큐카드'), h('button', { class: 'btn small', onclick: () => { location.hash = '#/settings'; } }, '설정')),
    h('main', {},
      !isStandalone() ? h('button', { class: 'notice warn', style: { width: '100%', textAlign: 'left', border: 0 }, onclick: () => installGuide() }, '홈 화면에 추가해서 쓰면 전체 화면으로 열리고, 오래 쓰지 않아도 저장한 원고가 지워질 위험이 줄어듭니다. 방법 보기 ›') : null,
      search, chips, listEl,
      h('div', { class: 'credit' }, 'LIGHTUP MEDIA.')),
    h('footer', { class: 'bottom-bar' }, h('button', { class: 'btn primary big', onclick: () => { location.hash = '#/import'; } }, '＋ 원고 가져오기'))));
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
