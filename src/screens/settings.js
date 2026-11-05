// 설정: 시작 설정의 모든 항목 + 글자 크기·줄 간격·여백·읽기 옵션·백업
import { h, sheet, toast, confirmSheet, pickFile } from '../core/ui.js';
import { getSettings, saveSettings, cardFontPx, baseFontPx, MIN_FONT_PX, resetSettings } from '../core/settings.js';
import { PURPOSES, FONTS, WEIGHTS, presetFor } from '../data/presets.js';
import { DEVICES, measureThisDevice } from '../data/devices.js';
import { exportBackup, importJSON } from '../core/backup.js';
import { installGuide } from './library.js';

export default function settings(root, arg) {
  const back = arg && arg.startsWith('read:') ? `#/read/${arg.slice(5)}` : '#/home';
  const draw = () => {
    const s = getSettings();
    const scroll = window.scrollY;
    root.innerHTML = '';
    const set = (patch) => { saveSettings(patch); draw(); };

    const seg = (key, opts) => h('div', { class: 'seg' }, opts.map(([v, l]) => h('button', { class: s[key] === v ? 'on' : '', onclick: () => set({ [key]: v }) }, l)));
    const sw = (key, label, desc) => h('div', { class: 'set-row' },
      h('label', { for: 'sw-' + key }, label, desc ? h('div', { class: 'muted small' }, desc) : null),
      h('input', { type: 'checkbox', class: 'switch', id: 'sw-' + key, checked: !!s[key] || null, onchange: (e) => set({ [key]: e.target.checked }) }));
    const range = (key, label, min, max, step, fmt) => {
      const val = h('span', { class: 'val' }, fmt(s[key]));
      return h('div', { class: 'set-row' }, h('span', { class: 'lbl' }, label),
        h('input', { type: 'range', min, max, step, value: s[key], 'aria-label': label,
          oninput: (e) => { const v = parseFloat(e.target.value); saveSettings({ [key]: v }); val.textContent = fmt(v); },
        }), val);
    };
    const minScale = Math.ceil((MIN_FONT_PX / baseFontPx(s)) * 100) / 100;

    root.append(h('div', { class: 'screen settings' },
      h('header', { class: 'topbar' }, h('button', { class: 'btn ghost', onclick: () => { location.hash = back; } }, '‹ 돌아가기'), h('h1', {}, '설정')),
      h('main', {},
        h('div', { class: 'live-sample', html: '하나님이 세상을 이처럼 <span class="em">사랑하사</span> 독생자를 주셨으니 <span class="v">(요 3:16)</span>' }),
        h('h3', {}, '글자와 카드 (바꾸면 카드가 바로 다시 나뉩니다)'),
        h('div', { class: 'card-list' },
          range('fontScale', '글자 크기', minScale, 1.8, 0.02, (v) => `${cardFontPx({ ...s, fontScale: v })}px`),
          range('lineHeight', '줄 간격', 1.25, 2.3, 0.05, (v) => v.toFixed(2)),
          range('margin', '좌우 여백', 0.3, 3, 0.1, (v) => `${Math.round(v * 100)}%`),
          h('div', { class: 'set-row' }, h('span', { class: 'lbl' }, '글꼴'),
            h('select', { class: 'input', onchange: (e) => set({ font: e.target.value }) }, FONTS.map((f) => h('option', { value: f.id, selected: s.font === f.id || null }, f.label)))),
          h('div', { class: 'set-row' }, h('span', { class: 'lbl' }, '본문 굵기'),
            h('select', { class: 'input', onchange: (e) => set({ weight: +e.target.value }) }, WEIGHTS.map((w, i) => h('option', { value: i, selected: s.weight === i || null }, w.label)))),
          h('div', { class: 'set-row' }, h('span', { class: 'lbl' }, '화면 모드'), seg('theme', [['light', '밝게'], ['dark', '어둡게'], ['auto', '자동']]))),

        h('h3', {}, '읽기 화면'),
        h('div', { class: 'card-list' },
          sw('leftHanded', '왼손잡이용 넘김', '왼쪽을 누르면 다음 카드, 오른쪽을 누르면 이전 카드'),
          sw('transition', '넘김 전환 효과', '짧고 부드러운 움직임'),
          sw('showCardNumber', '카드 번호 표시'),
          sw('showProgress', '진행 막대 표시'),
          sw('showNotes', '카드 메모 표시'),
          sw('verseHighlight', '성경 본문 강조', '성경 구절을 색과 굵기로 구분'),
          sw('timer', '목표 시간 안내', '읽기 화면 메뉴 → 목표 시간에서 시작'),
          h('div', { class: 'set-row' }, h('span', { class: 'lbl' }, '기본 목표 시간'),
            h('input', { class: 'input', type: 'number', inputmode: 'numeric', min: 1, style: { width: '110px' }, value: s.targetMinutes, onchange: (e) => set({ targetMinutes: Math.max(1, +e.target.value || 30) }) }), h('span', { class: 'val' }, '분'))),

        h('h3', {}, '용도와 기기'),
        h('div', { class: 'card-list' },
          h('div', { class: 'set-row' }, h('span', { class: 'lbl' }, '용도'),
            h('select', { class: 'input', onchange: async (e) => {
              const id = e.target.value;
              if (await confirmSheet('용도 바꾸기', '이 용도의 기본값(강조·시간 안내·줄 간격 등)을 함께 적용할까요?', '기본값 적용', 'primary')) set({ ...presetFor(id), font: s.font, weight: s.weight, device: s.device, purpose: id });
              else set({ purpose: id });
            } }, PURPOSES.map((p) => h('option', { value: p.id, selected: s.purpose === p.id || null }, p.label)))),
          h('div', { class: 'set-row' }, h('span', { class: 'lbl' }, '기기', h('div', { class: 'muted small' }, s.device ? `${s.device.name} · ${s.device.inch}형` : '—')),
            h('button', { class: 'btn small', onclick: () => set({ device: measureThisDevice() }) }, '자동 맞추기'),
            h('select', { class: 'input', 'aria-label': '기기 고르기', onchange: (e) => { const d = DEVICES.find((x) => x.id === e.target.value); if (d) set({ device: { ...d } }); } },
              h('option', { value: '' }, '목록에서 고르기'), DEVICES.map((d) => h('option', { value: d.id, selected: s.device?.id === d.id || null }, d.name))))),

        h('h3', {}, '백업'),
        h('div', { class: 'card-list' },
          h('div', { class: 'set-row' }, h('span', { class: 'lbl' }, '전체 원고와 설정 내보내기', h('div', { class: 'muted small' }, 'JSON 파일 하나로 저장합니다')),
            h('button', { class: 'btn small', onclick: () => exportBackup() }, '내보내기')),
          h('div', { class: 'set-row' }, h('span', { class: 'lbl' }, '백업 불러오기'),
            h('button', { class: 'btn small', onclick: async () => {
              const f = await pickFile('.json,application/json');
              if (!f) return;
              let data;
              try { data = JSON.parse(await f.text()); } catch { return toast('백업 파일을 읽지 못했습니다.', 'error'); }
              const run = async (mode) => {
                try { const r = await importJSON(data, mode); toast(`원고 ${r.count}개를 불러왔습니다.`); draw(); }
                catch (e) { toast(e.message, 'error'); }
              };
              if (data.kind === 'manuscript') return run('merge');
              sheet('불러오는 방법', h('p', { class: 'muted' }, '합치기: 지금 원고는 그대로 두고 백업의 원고를 더합니다(같은 원고는 더 최신 쪽을 남김).\n덮어쓰기: 지금 원고와 설정을 모두 지우고 백업으로 바꿉니다.'), {
                actions: [{ label: '합치기', kind: 'primary', run: () => run('merge') }, { label: '덮어쓰기', kind: 'danger', run: async () => { if (await confirmSheet('덮어쓰기', '지금 기기의 원고가 모두 지워집니다. 계속할까요?', '덮어쓰기')) run('replace'); } }],
              });
            } }, '불러오기')),
          h('button', { class: 'set-row', style: { width: '100%', border: 0, background: 'transparent', textAlign: 'left' }, onclick: installGuide }, h('span', { class: 'lbl' }, '홈 화면에 추가하는 방법'), h('span', { class: 'muted' }, '›'))),

        h('h3', {}, '처음으로'),
        h('div', { class: 'card-list' },
          h('button', { class: 'set-row', style: { width: '100%', border: 0, background: 'transparent', textAlign: 'left' }, onclick: () => { saveSettings({ setupDone: false }); location.hash = '#/setup'; } },
            h('span', { class: 'lbl' }, '시작 설정 처음부터 다시 하기', h('div', { class: 'muted small' }, '원고는 그대로 남습니다')), h('span', { class: 'muted' }, '›')),
          h('button', { class: 'set-row', style: { width: '100%', border: 0, background: 'transparent', textAlign: 'left' }, onclick: async () => {
            if (await confirmSheet('설정 초기화', '모든 설정을 처음 값으로 되돌리고 시작 설정을 다시 합니다. 원고는 남습니다.', '초기화')) { resetSettings(); location.hash = '#/setup'; }
          } }, h('span', { class: 'lbl', style: { color: 'var(--danger)' } }, '설정 초기화'))),
        h('p', { class: 'muted small', style: { textAlign: 'center', marginTop: '24px' } }, '큐카드는 서버 없이 이 기기 안에서만 동작합니다. 원고는 어디로도 전송되지 않습니다.'),
        h('div', { class: 'credit' }, 'LIGHTUP MEDIA.'))));
    window.scrollTo(0, scroll);
  };
  draw();
}
