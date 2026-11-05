// 시작 설정: 한 화면에 질문 하나씩, 다섯 단계 + 요약
import { h } from '../core/ui.js';
import { PURPOSES, presetFor, FONTS, WEIGHTS, WEIGHT_SCALE, SAMPLE, purposeLabel } from '../data/presets.js';
import { DEVICES, measureThisDevice } from '../data/devices.js';
import { getSettings, saveSettings } from '../core/settings.js';

const SAMPLES = {
  sermon: SAMPLE,
  present: '오늘 말씀드릴 내용은 세 가지입니다. 첫째, 우리가 지금 어디에 서 있는지입니다.',
  lecture: '오늘 강연에서는 질문 하나에서 출발해 보겠습니다. 우리는 왜 읽는가.',
  speech: '귀한 자리에 함께해 주신 모든 분께 진심으로 감사의 인사를 드립니다.',
  reading: '바람이 불었다. 나는 오래도록 그 언덕 위에 서서 저무는 해를 바라보았다.',
  custom: SAMPLE,
};

export default function onboarding(root) {
  const prev = getSettings();
  const d = { ...prev, purpose: prev.purpose || null, device: prev.device || null };
  let step = 0;
  const STEPS = 5;

  const sample = () => SAMPLES[d.purpose] || SAMPLE;

  function choose(patch, next = true) {
    Object.assign(d, patch);
    if (next) { step++; draw(); } else draw();
  }

  const option = (selected, onClick, ...kids) =>
    h('button', { class: 'choice' + (selected ? ' on' : ''), 'aria-pressed': selected ? 'true' : 'false', onclick: onClick }, ...kids);

  function stepPurpose() {
    return [
      h('h1', {}, '이 앱을 어디에 쓰시나요?'),
      h('p', { class: 'muted' }, '고르면 용도에 맞는 기본값이 다음 단계에 미리 채워집니다. 나중에 설정에서 언제든 바꿀 수 있어요.'),
      h('div', { class: 'choices grid2' }, PURPOSES.map((p) => option(d.purpose === p.id, () => {
        const keep = { device: d.device };
        Object.assign(d, presetFor(p.id), keep, { purpose: p.id });
        step++; draw();
      }, h('strong', {}, p.label), h('span', { class: 'muted small' }, p.desc)))),
    ];
  }

  function stepDevice() {
    const manualW = h('input', { class: 'input', type: 'number', inputmode: 'numeric', placeholder: '가로 (예: 820)', value: d.device?.manual ? d.device.width : '' });
    const manualH = h('input', { class: 'input', type: 'number', inputmode: 'numeric', placeholder: '세로 (예: 1180)', value: d.device?.manual ? d.device.height : '' });
    const manualI = h('input', { class: 'input', type: 'number', inputmode: 'decimal', step: '0.1', placeholder: '대각선 인치 (예: 11)', value: d.device?.manual ? d.device.inch : '' });
    const groups = [...new Set(DEVICES.map((x) => x.group))];
    return [
      h('h1', {}, '어떤 기기에서 읽으시나요?'),
      h('p', { class: 'muted' }, '화면 크기에 맞춰 카드 한 장의 글자 크기와 분량을 계산합니다.'),
      h('button', { class: 'btn primary big auto-fit', onclick: () => choose({ device: measureThisDevice() }) },
        h('strong', {}, '이 기기로 자동 맞추기'),
        h('span', { class: 'small' }, `지금 화면을 직접 잽니다 · ${Math.min(screen.width, screen.height)}×${Math.max(screen.width, screen.height)}, 화소 비율 ${window.devicePixelRatio || 1}`)),
      groups.map((g) => [
        h('h3', { class: 'group-title' }, g),
        h('div', { class: 'choices list' }, DEVICES.filter((x) => x.group === g).map((dev) =>
          option(d.device?.id === dev.id, () => choose({ device: { ...dev } }),
            h('strong', {}, dev.name), h('span', { class: 'muted small' }, `${dev.inch}형 · ${dev.width}×${dev.height} · ${dev.dpr}x`)))),
      ]),
      h('details', { class: 'manual', open: d.device?.manual || null },
        h('summary', {}, '목록에 없는 기기 · 화면 크기 직접 입력'),
        h('p', { class: 'muted small' }, '가로·세로는 브라우저 기준 크기(CSS 픽셀)이고, 모르면 대각선 인치만 넣어도 됩니다.'),
        h('div', { class: 'row3' }, manualW, manualH, manualI),
        h('button', { class: 'btn', onclick: () => {
          const inch = parseFloat(manualI.value) || 0;
          const w = parseInt(manualW.value, 10) || Math.min(screen.width, screen.height);
          const hh = parseInt(manualH.value, 10) || Math.max(screen.width, screen.height);
          choose({ device: { id: 'manual', manual: true, name: '직접 입력한 기기', width: w, height: hh, dpr: window.devicePixelRatio || 1, inch: inch || Math.round(Math.hypot(w, hh) / 132 * 10) / 10 } });
        } }, '이 크기로 정하기')),
    ];
  }

  function stepFont() {
    return [
      h('h1', {}, '글꼴을 고르세요'),
      h('p', { class: 'muted' }, '실제 원고 문장으로 보여드립니다.'),
      h('div', { class: 'choices list' }, FONTS.map((f) => option(d.font === f.id, () => choose({ font: f.id }),
        h('span', { class: 'muted small' }, f.label + (f.id === 'paperlogy' ? ' · 기본' : '')),
        h('span', { class: 'preview-text', style: { fontFamily: f.css, fontWeight: WEIGHT_SCALE[d.weight ?? 1] } }, sample())))),
      h('p', { class: 'muted small' }, '둥근 글꼴이 기기에 없으면 고딕으로 보입니다. 페이퍼로지 파일이 없으면 시스템 고딕으로 대체됩니다.'),
    ];
  }

  function stepWeight() {
    const css = (FONTS.find((f) => f.id === d.font) || FONTS[0]).css;
    return [
      h('h1', {}, '글자 굵기를 고르세요'),
      h('p', { class: 'muted' }, '강조 표시는 고른 굵기보다 두 단계 굵게 보입니다.'),
      h('div', { class: 'choices list' }, WEIGHTS.map((w, i) => option(d.weight === i, () => choose({ weight: i }),
        h('span', { class: 'muted small' }, w.label),
        h('span', { class: 'preview-text', style: { fontFamily: css, fontWeight: w.value } }, sample())))),
    ];
  }

  function stepTheme() {
    const opt = (id, label, desc, cls) => option(d.theme === id, () => choose({ theme: id }),
      h('span', { class: 'theme-swatch ' + cls }, h('span', {}, '가')),
      h('span', { class: 'col' }, h('strong', {}, label), h('span', { class: 'muted small' }, desc)));
    return [
      h('h1', {}, '화면 모드를 고르세요'),
      h('div', { class: 'choices list' },
        opt('light', '밝은 모드', '밝은 곳, 낮 예배와 회의실', 'sw-light'),
        opt('dark', '어두운 모드', '어두운 예배당과 강당에서 눈부시지 않게', 'sw-dark'),
        opt('auto', '자동', '기기의 밝은·어두운 설정을 따릅니다', 'sw-auto')),
    ];
  }

  function summary() {
    const font = FONTS.find((f) => f.id === d.font) || FONTS[0];
    const row = (k, v, s) => h('button', { class: 'sum-row', onclick: () => { step = s; draw(); } }, h('span', { class: 'muted' }, k), h('strong', {}, v), h('span', { class: 'muted small' }, '바꾸기'));
    return [
      h('h1', {}, '준비됐습니다'),
      h('div', { class: 'card-list' },
        row('용도', purposeLabel(d.purpose), 0),
        row('기기', d.device ? `${d.device.name} · ${d.device.inch}형` : '—', 1),
        row('글꼴', font.label, 2),
        row('굵기', WEIGHTS[d.weight ?? 1].label, 3),
        row('화면 모드', { light: '밝은 모드', dark: '어두운 모드', auto: '자동' }[d.theme], 4)),
      h('p', { class: 'muted small' }, '선택한 값은 이 기기에만 저장됩니다. 설정 화면에서 언제든 다시 바꿀 수 있어요.'),
    ];
  }

  function draw() {
    const views = [stepPurpose, stepDevice, stepFont, stepWeight, stepTheme, summary];
    const canNext = [d.purpose, d.device, d.font, d.weight != null, d.theme][step];
    root.innerHTML = '';
    root.append(h('div', { class: 'screen onboarding' },
      h('header', { class: 'ob-top' },
        h('button', { class: 'btn ghost', disabled: step === 0 || null, onclick: () => { step--; draw(); } }, '‹ 이전'),
        h('div', { class: 'dots', 'aria-label': `${Math.min(step + 1, STEPS)} / ${STEPS} 단계` },
          Array.from({ length: STEPS }, (_, i) => h('span', { class: 'dot' + (i < step ? ' done' : i === step ? ' on' : '') }))),
        h('span', { class: 'ob-spacer' })),
      h('main', { class: 'ob-body' }, views[step]()),
      h('footer', { class: 'bottom-bar' },
        step < STEPS
          ? h('button', { class: 'btn primary big', disabled: !canNext || null, onclick: () => { step++; draw(); } }, '다음')
          : h('button', { class: 'btn primary big', onclick: () => {
              saveSettings({ ...d, setupDone: true });
              location.hash = '#/home';
            } }, '시작하기'))));
  }
  draw();
}
