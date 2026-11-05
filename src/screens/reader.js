// 카드 읽기 화면
import { h, sheet, toast } from '../core/ui.js';
import { getManuscript, saveManuscript } from '../core/storage.js';
import { getSettings, saveSettings, onSettings, cardFontPx, MIN_FONT_PX, baseFontPx } from '../core/settings.js';
import { buildPages } from '../core/paginate.js';
import { runsHTML, charCount } from '../core/runs.js';

const LONG_PRESS = 550;
const SWIPE = 40;

export default async function reader(root, id) {
  const m = await getManuscript(id);
  if (!m) { toast('원고를 찾을 수 없습니다.', 'error'); location.hash = '#/home'; return; }
  let s = getSettings();
  m.lastOpened = Date.now();
  m.timer = m.timer || { start: null, minutes: s.targetMinutes };
  saveManuscript(m, { quiet: true });

  let pages = [];
  let idx = 0;
  let cum = []; // 각 페이지 앞까지의 글자 수(진행 시간 계산용)

  // 화면 뼈대
  const timerEl = h('span', { class: 'timer' });
  const textEl = h('div', { class: 'card-text' });
  const noteEl = h('div', { class: 'card-note' });
  const countEl = h('span', { class: 'count' });
  const barEl = h('i');
  const progEl = h('div', { class: 'progress' }, barEl);
  const bottomEl = h('div', { class: 'card-bottom' }, countEl, progEl);
  const card = h('div', { class: 'card' },
    h('div', { class: 'card-top' }, timerEl),
    h('div', { class: 'card-body' }, textEl, noteEl),
    bottomEl);
  const flashL = h('div', { class: 'edge-flash', style: { left: 0 } });
  const flashR = h('div', { class: 'edge-flash', style: { right: 0 } });
  const menuKey = h('button', { class: 'menu-key', 'aria-label': '메뉴', onclick: (e) => { e.stopPropagation(); openMenu(); } }, h('i'));
  const hint = h('div', { class: 'hint' }, '');
  const stage = h('div', { class: 'reader', role: 'main', 'aria-label': m.title, tabindex: '-1' }, card, flashL, flashR, hint, menuKey);
  root.append(stage);

  function layout(keep = true) {
    const anchor = keep && pages[idx] ? { g: pages[idx].groupId, o: pages[idx].start } : { g: m.position?.cardId, o: m.position?.offset || 0 };
    s = getSettings();
    stage.classList.toggle('lefty', !!s.leftHanded);
    bottomEl.classList.toggle('empty', !s.showCardNumber && !s.showProgress);
    countEl.style.display = s.showCardNumber ? '' : 'none';
    progEl.style.display = s.showProgress ? '' : 'none';
    pages = buildPages(m.cards, s.showNotes);
    cum = []; let c = 0;
    for (const p of pages) { cum.push(c); c += charCount(p.runs); }
    cum.push(c);
    const found = pages.findIndex((p) => p.groupId === anchor.g && anchor.o >= p.start && anchor.o < Math.max(p.end, p.start + 1));
    const groupFirst = pages.findIndex((p) => p.groupId === anchor.g);
    idx = found >= 0 ? found : groupFirst >= 0 ? groupFirst : 0;
    show(0);
  }

  function show(dir) {
    const p = pages[idx];
    if (!p) return;
    textEl.innerHTML = runsHTML(p.runs, { verse: !!s.verseHighlight });
    noteEl.textContent = p.note || '';
    noteEl.style.display = p.note ? '' : 'none';
    countEl.textContent = `${idx + 1} / ${pages.length}`;
    barEl.style.width = (pages.length > 1 ? (idx / (pages.length - 1)) * 100 : 100) + '%';
    if (dir && s.transition) {
      card.classList.remove('enter-next', 'enter-prev');
      void card.offsetWidth;
      card.classList.add(dir > 0 ? 'enter-next' : 'enter-prev');
    }
    tickTimer();
    savePos();
  }

  let posTimer;
  function savePos() {
    clearTimeout(posTimer);
    posTimer = setTimeout(() => {
      const p = pages[idx]; if (!p) return;
      m.position = { cardId: p.groupId, offset: p.start };
      saveManuscript(m, { quiet: true });
    }, 400);
  }

  function flash(el) { el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  function next() { if (idx < pages.length - 1) { idx++; show(1); } else flash(s.leftHanded ? flashL : flashR); }
  // 이전 카드로 가는 동작은 언제나 가능합니다.
  function prev() { if (idx > 0) { idx--; show(-1); } else flash(s.leftHanded ? flashR : flashL); }
  function jump(i) { const d = i > idx ? 1 : -1; idx = Math.max(0, Math.min(pages.length - 1, i)); show(d); }

  // ── 목표 시간 ──
  function tickTimer() {
    if (!s.timer || !m.timer.start) { timerEl.textContent = ''; timerEl.className = 'timer'; return; }
    const elapsed = Math.max(0, (Date.now() - m.timer.start) / 1000);
    const total = (m.timer.minutes || s.targetMinutes) * 60;
    const mm = Math.floor(elapsed / 60), ss = Math.floor(elapsed % 60);
    if (Date.now() < m.timer.start) {
      const wait = Math.ceil((m.timer.start - Date.now()) / 60000);
      timerEl.textContent = `${wait}분 후 시작`; timerEl.className = 'timer'; return;
    }
    // 이 카드까지 와 있어야 할 시각(글자 수 비례)
    const done = cum.length ? cum[idx] / Math.max(1, cum[cum.length - 1]) : 0;
    const expected = elapsed / total;
    const plan = Math.round(done * total / 60);
    timerEl.textContent = `${mm}:${String(ss).padStart(2, '0')} · ${plan}′/${Math.round(total / 60)}′`;
    const diff = done - expected; // +면 목표보다 빠름
    timerEl.className = 'timer' + (diff > 0.05 ? ' ahead' : diff < -0.05 ? ' behind' : '');
    timerEl.title = diff > 0.05 ? '목표보다 빠릅니다' : diff < -0.05 ? '목표보다 느립니다' : '목표에 맞습니다';
  }
  const timerInt = setInterval(tickTimer, 1000);

  function openTimer() {
    const min = h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: '1', value: m.timer.minutes || s.targetMinutes });
    const at = h('input', { class: 'input', type: 'time' });
    if (m.timer.start) { const d = new Date(m.timer.start); at.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
    const setStart = (ts) => { m.timer = { start: ts, minutes: Math.max(1, parseInt(min.value, 10) || 30) }; saveManuscript(m, { quiet: true }); if (!s.timer) saveSettings({ timer: true }); tickTimer(); };
    sheet('목표 시간', h('div', {},
      h('p', { class: 'muted small' }, '카드 분량에 비례해 지금 몇 분쯤이어야 하는지 구석에 작게 보여줍니다. 목표보다 빠르면 초록빛, 느리면 주황빛으로 아주 은은하게 바뀝니다.'),
      h('label', { class: 'muted small' }, '목표 분'), min,
      h('label', { class: 'muted small', style: { display: 'block', marginTop: '12px' } }, '시작 시각 (비우면 지금)'), at), {
      actions: [
        { label: '끄기', run: () => { m.timer.start = null; saveManuscript(m, { quiet: true }); tickTimer(); } },
        { label: '시작', kind: 'primary', run: () => {
          let ts = Date.now();
          if (at.value) { const [hh, mi] = at.value.split(':').map(Number); const d = new Date(); d.setHours(hh, mi, 0, 0); ts = d.getTime(); }
          setStart(ts);
        } },
      ],
    });
  }

  // ── 카드 목록 ──
  function openList() {
    const grid = h('div', { class: 'jump-grid' }, pages.map((p, i) => h('div', {
      class: 'mini' + (i === idx ? ' on' : ''), role: 'button', tabindex: '0',
      html: runsHTML(p.runs, { verse: !!s.verseHighlight }) + `<span class="n">${i + 1}</span>`,
      onclick: () => { jump(i); ref.close(); },
    })));
    const ref = sheet(`카드 목록 · ${pages.length}장`, grid);
    setTimeout(() => grid.children[idx]?.scrollIntoView({ block: 'center' }), 60);
  }

  // ── 메뉴 ──
  function openMenu() {
    const fsVal = h('span', { class: 'val' }, cardFontPx() + 'px');
    const adj = (d) => {
      const base = baseFontPx();
      const cur = getSettings().fontScale || 1;
      const nextScale = Math.max(MIN_FONT_PX / base, Math.min(2, Math.round((cur + d) * 100) / 100));
      saveSettings({ fontScale: nextScale });
      fsVal.textContent = cardFontPx() + 'px';
    };
    const ref = sheet(m.title, h('div', {},
      h('div', { class: 'card-list' },
        h('div', { class: 'set-row' }, h('span', { class: 'lbl' }, '글자 크기'),
          h('button', { class: 'btn small', 'aria-label': '작게', onclick: () => adj(-0.06) }, '가−'), fsVal,
          h('button', { class: 'btn small', 'aria-label': '크게', onclick: () => adj(0.06) }, '가+'))),
      h('div', { class: 'choices list' },
        h('button', { class: 'btn big', onclick: () => { ref.close(); openList(); } }, '카드 목록'),
        h('button', { class: 'btn big', onclick: () => { ref.close(); openTimer(); } }, '목표 시간'),
        h('button', { class: 'btn big', onclick: () => { location.hash = `#/edit/${encodeURIComponent(m.id)}`; } }, '카드 편집'),
        h('button', { class: 'btn big', onclick: () => { location.hash = `#/settings/${encodeURIComponent('read:' + m.id)}`; } }, '설정'),
        h('button', { class: 'btn big danger', onclick: () => { location.hash = '#/home'; } }, '읽기 종료'))));
  }

  // ── 터치·마우스 입력 ──
  let down = null, lpTimer = null, lpFired = false;
  const zone = (x) => { const w = stage.clientWidth; return x > w * 0.62 ? 'R' : x < w * 0.38 ? 'L' : 'M'; };
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.menu-key') || document.querySelector('.sheet-wrap')) return;
    down = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
    lpFired = false;
    clearTimeout(lpTimer);
    if (zone(e.clientX) === 'M') lpTimer = setTimeout(() => { lpFired = true; navigator.vibrate?.(10); openList(); }, LONG_PRESS);
  });
  stage.addEventListener('pointermove', (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) clearTimeout(lpTimer);
  });
  const end = (e) => {
    clearTimeout(lpTimer);
    if (!down || lpFired) { down = null; return; }
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    const flip = s.leftHanded ? -1 : 1;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy) * 1.2) {
      (dx < 0 ? flip > 0 : flip < 0) ? next() : prev();
    } else if (Math.abs(dx) < 14 && Math.abs(dy) < 14) {
      const z = zone(down.x);
      if (z === 'R') flip > 0 ? next() : prev();
      else if (z === 'L') flip > 0 ? prev() : next();
    }
    down = null;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', () => { clearTimeout(lpTimer); down = null; });

  // 확대·축소, 더블탭 확대, 글자 선택, 확대경 막기
  const stop = (e) => e.preventDefault();
  const touchMove = (e) => { if (!e.target.closest('.sheet')) e.preventDefault(); };
  const blockTouchEnd = (e) => { if (!e.target.closest('.sheet, .menu-key') && e.cancelable) e.preventDefault(); };
  document.addEventListener('gesturestart', stop);
  document.addEventListener('gesturechange', stop);
  stage.addEventListener('touchmove', touchMove, { passive: false });
  stage.addEventListener('touchend', blockTouchEnd, { passive: false }); // 더블탭 확대 방지(클릭은 pointerup으로 처리)
  stage.addEventListener('dblclick', stop);
  stage.addEventListener('contextmenu', stop);
  stage.addEventListener('selectstart', stop);

  // 발표용 리모컨·키보드
  const onKey = (e) => {
    if (document.querySelector('.sheet-wrap')) { if (e.key === 'Escape') document.querySelector('.sheet-wrap .icon-btn')?.click(); return; }
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === 'Escape') openMenu();
  };
  document.addEventListener('keydown', onKey);

  // ── 화면 꺼짐 방지 ──
  let lock = null;
  async function requestLock() {
    try { if ('wakeLock' in navigator && document.visibilityState === 'visible') { lock = await navigator.wakeLock.request('screen'); } } catch { /* 지원하지 않거나 거부됨 */ }
  }
  const onVis = () => { if (document.visibilityState === 'visible') { requestLock(); tickTimer(); } };
  document.addEventListener('visibilitychange', onVis);
  requestLock();

  // ── 화면 크기 변화(회전·분할 화면)에 맞춰 다시 나누기 ──
  let rz; let lastSize = `${innerWidth}x${innerHeight}`;
  const onResize = () => {
    clearTimeout(rz);
    rz = setTimeout(() => { const now = `${innerWidth}x${innerHeight}`; if (now !== lastSize) { lastSize = now; layout(true); } }, 160);
  };
  const ro = new ResizeObserver(onResize);
  ro.observe(stage);
  window.visualViewport?.addEventListener('resize', onResize);
  const offSettings = onSettings(() => layout(true));

  // 글꼴 파일을 다 불러온 뒤에 재야 정확합니다.
  await (document.fonts?.ready || Promise.resolve());
  layout(false);
  stage.focus();
  hint.textContent = s.leftHanded ? '왼쪽을 누르면 다음 · 가운데를 길게 누르면 목록' : '오른쪽을 누르면 다음 · 가운데를 길게 누르면 목록';
  setTimeout(() => { hint.style.opacity = 0; }, 2600);

  return () => {
    clearInterval(timerInt); clearTimeout(posTimer); ro.disconnect(); offSettings();
    window.visualViewport?.removeEventListener('resize', onResize);
    document.removeEventListener('gesturestart', stop);
    document.removeEventListener('gesturechange', stop);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    lock?.release?.().catch(() => {});
    if (pages[idx]) { m.position = { cardId: pages[idx].groupId, offset: pages[idx].start }; saveManuscript(m, { quiet: true }); }
    document.querySelectorAll('.sheet-wrap').forEach((x) => x.remove());
  };
}
