// 가져오기: 파일 선택, 끌어놓기, 붙여넣기를 한 화면에 나란히
import { h, sheet, toast, fmtMin, pickFile } from '../core/ui.js';
import { importFile, importPaste, ImportError, ACCEPT } from '../import/index.js';
import { newManuscript, manuscriptChars, importJSON } from '../core/backup.js';
import { saveManuscript } from '../core/storage.js';
import { getSettings } from '../core/settings.js';
import { PURPOSES } from '../data/presets.js';
import { runsHTML } from '../core/runs.js';
import { buildPages } from '../core/paginate.js';

export default function importer(root) {
  const busy = h('div', { class: 'notice', style: { display: 'none' } }, '읽는 중입니다…');

  async function handleFile(file) {
    if (!file) return;
    busy.style.display = ''; busy.textContent = `“${file.name}” 읽는 중입니다…`;
    try {
      const res = await importFile(file);
      if (res.json) {
        const r = await importJSON(res.json, 'merge');
        toast(`원고 ${r.count}개를 가져왔습니다.`);
        location.hash = r.id ? `#/edit/${r.id}` : '#/home';
        return;
      }
      await review(res.blocks, res.name);
    } catch (e) {
      console.error(e);
      if (e instanceof ImportError) guide(e.kind, e.message);
      else toast('파일을 읽지 못했습니다. 내용을 복사해서 붙여넣기로 넣어 주세요.', 'error', 5000);
    } finally { busy.style.display = 'none'; }
  }

  function guide(kind, msg) {
    const bodies = {
      hwp: [h('p', {}, '옛 한글 형식(.hwp)은 브라우저 안에서 읽을 수 없습니다. 아래 두 방법 중 하나로 넣어 주세요.'),
        h('h3', {}, '방법 1 · hwpx로 다시 저장하기'),
        h('ol', { class: 'steps' }, h('li', {}, '한글에서 원고 파일을 엽니다.'), h('li', {}, '파일 → 다른 이름으로 저장하기를 누릅니다.'),
          h('li', {}, '파일 형식에서 “한글 표준 문서 (*.hwpx)”를 고릅니다.'), h('li', {}, '저장한 .hwpx 파일을 이 화면에 넣습니다.')),
        h('h3', {}, '방법 2 · 복사해서 붙여넣기'),
        h('ol', { class: 'steps' }, h('li', {}, '한글에서 Ctrl+A(맥은 ⌘A)로 전체를 고르고 복사합니다.'), h('li', {}, '이 화면의 “붙여넣기” 칸을 누르고 붙여넣습니다.'), h('li', {}, '제목과 굵은 글자는 그대로 살아납니다.'))],
      doc: [h('p', {}, '옛 워드 형식(.doc)은 읽을 수 없습니다. 워드에서 .docx로 다시 저장하거나, 내용을 복사해 붙여넣어 주세요.')],
      scanned: [h('p', {}, '이 pdf에는 글자 정보가 없습니다(스캔한 이미지로 보입니다). 큐카드는 글자가 들어 있는 pdf만 지원합니다.'),
        h('ol', { class: 'steps' }, h('li', {}, '원본 문서(한글·워드)가 있으면 그 파일을 넣어 주세요.'), h('li', {}, '없으면 글을 복사해서 “붙여넣기” 칸에 넣어 주세요.'))],
      empty: [h('p', {}, '파일에서 글을 찾지 못했습니다. 내용을 복사해서 붙여넣기로 넣어 주세요.')],
      unsupported: [h('p', {}, msg), h('p', { class: 'muted' }, '지원 형식: hwpx, docx, txt, 마크다운(md), pdf. 다른 형식은 복사해서 붙여넣어 주세요.')],
    };
    sheet(kind === 'hwp' ? 'hwp 파일 안내' : '가져오기 안내', h('div', {}, bodies[kind] || bodies.unsupported), { actions: [{ label: '붙여넣기로 넣기', kind: 'primary', run: () => pasteBox.focus() }] });
  }

  // 가져온 뒤: 제목·글자 수·예상 낭독 시간 → 카드 나누기 미리보기
  async function review(blocks, name) {
    await (document.fonts?.ready || Promise.resolve());
    const m = newManuscript(blocks, null);
    if (name && /^새 원고$/.test(m.title)) m.title = name;
    const s = getSettings();
    const chars = manuscriptChars(m);
    const titleIn = h('input', { class: 'input', value: m.title, 'aria-label': '제목' });
    const purposeSel = h('select', { class: 'input' }, PURPOSES.map((p) => h('option', { value: p.id, selected: p.id === m.purpose || null }, p.label)));
    const pages = buildPages(m.cards, false);
    root.innerHTML = '';
    root.append(h('div', { class: 'screen' },
      h('header', { class: 'topbar' }, h('button', { class: 'btn ghost', onclick: () => importer(root.replaceChildren() || root) }, '‹ 다시 가져오기'), h('h1', {}, '카드 나누기 미리보기')),
      h('main', {},
        h('label', { class: 'muted small' }, '제목'), titleIn,
        h('label', { class: 'muted small', style: { display: 'block', marginTop: '10px' } }, '용도'), purposeSel,
        h('div', { class: 'stats' },
          h('div', { class: 'stat' }, h('span', { class: 'muted small' }, '글자 수'), h('b', {}, chars.toLocaleString())),
          h('div', { class: 'stat' }, h('span', { class: 'muted small' }, '예상 낭독'), h('b', {}, fmtMin(chars, s.charsPerMinute))),
          h('div', { class: 'stat' }, h('span', { class: 'muted small' }, '카드'), h('b', {}, `${pages.length}장`))),
        h('p', { class: 'notice' }, '제목·번호·빈 줄·성경 구절에서 먼저 나누고, 한 장을 넘는 부분은 문장이 끊기지 않는 자리에서 이어서 나눴습니다. 화면 크기나 글자 크기를 바꾸면 자동으로 다시 맞춰집니다.'),
        h('div', { class: 'mini-cards' }, pages.map((p, i) => h('div', { class: 'mini', html: runsHTML(p.runs, { verse: !!s.verseHighlight }) + `<span class="n">${i + 1}</span>` })))),
      h('footer', { class: 'bottom-bar' },
        h('button', { class: 'btn big', onclick: () => save('edit') }, '카드 편집하기'),
        h('button', { class: 'btn primary big', onclick: () => save('read') }, '저장하고 읽기'))));
    async function save(to) {
      m.title = titleIn.value.trim() || m.title;
      m.purpose = purposeSel.value;
      if (await saveManuscript(m)) location.hash = `#/${to}/${m.id}`;
    }
  }

  // 화면
  const fileWay = h('div', { class: 'way' },
    h('h2', {}, '파일 선택'),
    h('p', { class: 'muted small' }, 'hwpx · docx · txt · md · pdf'),
    h('button', { class: 'btn primary big', style: { marginTop: 'auto' }, onclick: async () => handleFile(await pickFile(ACCEPT)) }, '파일 고르기'));
  const dropWay = h('div', { class: 'way' },
    h('h2', {}, '끌어놓기'),
    h('p', { class: 'muted small' }, '파일 앱이나 분할 화면에서 파일을 이 칸으로 끌어다 놓으세요.'),
    h('div', { class: 'muted', style: { marginTop: 'auto', textAlign: 'center', fontSize: '40px' } }, '⇣'));
  const pasteBox = h('div', { class: 'paste-box', contenteditable: 'true', 'data-ph': '여기를 누르고 붙여넣기 하세요', role: 'textbox', 'aria-multiline': 'true' });
  const pasteWay = h('div', { class: 'way' },
    h('h2', {}, '붙여넣기'),
    h('p', { class: 'muted small' }, '노션·한글·웹에서 복사한 제목과 굵은 글자도 살립니다.'),
    pasteBox,
    h('button', { class: 'btn', onclick: () => {
      const blocks = importPaste({ html: pasteBox.innerHTML, text: pasteBox.innerText });
      if (!blocks.length) return toast('붙여넣은 글이 없습니다.');
      review(blocks, '');
    } }, '이 글로 만들기'));

  pasteBox.addEventListener('paste', (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    const blocks = importPaste({ html, text });
    if (blocks.length) review(blocks, '');
    else toast('붙여넣은 글이 없습니다.');
  });

  ['dragenter', 'dragover'].forEach((ev) => root.addEventListener(ev, (e) => { e.preventDefault(); dropWay.classList.add('drag'); }));
  root.addEventListener('dragleave', (e) => { if (e.target === dropWay) dropWay.classList.remove('drag'); });
  root.addEventListener('drop', (e) => {
    e.preventDefault(); dropWay.classList.remove('drag');
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
    else { const html = e.dataTransfer.getData('text/html'); const text = e.dataTransfer.getData('text/plain'); if (text || html) review(importPaste({ html, text }), ''); }
  });

  root.append(h('div', { class: 'screen' },
    h('header', { class: 'topbar' }, h('button', { class: 'btn ghost', onclick: () => { location.hash = '#/home'; } }, '‹ 보관함'), h('h1', {}, '원고 가져오기')),
    h('main', {},
      h('p', { class: 'muted' }, '모든 변환은 이 기기 안에서만 이뤄지고, 글은 어디로도 보내지지 않습니다.'),
      busy,
      h('div', { class: 'import-ways' }, fileWay, dropWay, pasteWay),
      h('p', { class: 'muted small' }, '옛 한글(.hwp) 파일은 한글에서 hwpx로 다시 저장하거나 복사해 붙여넣어 주세요. 백업(.json) 파일도 여기서 넣을 수 있습니다.'))));
}
