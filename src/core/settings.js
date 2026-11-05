// 설정 저장과 화면 적용. 설정은 localStorage에 버전 번호와 함께 저장합니다.
import { BASE, FONTS, WEIGHT_SCALE } from '../data/presets.js';
import { toast } from './ui.js';

const KEY = 'cuecard.settings';
export const SETTINGS_VERSION = 1;

let current = null;
const listeners = new Set();

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw) current = migrateSettings(raw);
  } catch { /* 저장소 사용 불가 */ }
  return current;
}

export function migrateSettings(raw) {
  // 버전이 바뀌면 여기서 옛 구조를 새 구조로 옮깁니다.
  const v = raw.version || 1;
  const s = { ...BASE, ...raw };
  s.version = SETTINGS_VERSION;
  if (v < 1) { /* 예: 이름 바뀐 항목 옮기기 */ }
  return s;
}

export const getSettings = () => current || { ...BASE, version: SETTINGS_VERSION };
export const isSetUp = () => !!(current && current.setupDone);

export function saveSettings(patch) {
  current = { ...getSettings(), ...patch, version: SETTINGS_VERSION };
  try { localStorage.setItem(KEY, JSON.stringify(current)); }
  catch { toast('설정을 기기에 저장하지 못했습니다. 저장 공간을 확인해 주세요.', 'error'); }
  applySettings();
  listeners.forEach((fn) => fn(current));
  return current;
}

export function resetSettings() {
  current = null;
  try { localStorage.removeItem(KEY); } catch { /* 무시 */ }
}

export const onSettings = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

// 기기 크기에 맞는 기본 글자 크기(CSS px). 팔 길이(약 60cm)에서 읽히도록 크게 잡습니다.
export const MIN_FONT_PX = 24;
export function baseFontPx(s = getSettings()) {
  const inch = (s.device && s.device.inch) || 11;
  return Math.max(30, Math.min(44, 26 + inch * 1.2));
}
export function cardFontPx(s = getSettings()) {
  return Math.max(MIN_FONT_PX, Math.round(baseFontPx(s) * (s.fontScale || 1)));
}

let mql;
export function applySettings() {
  const s = getSettings();
  const root = document.documentElement;
  const font = FONTS.find((f) => f.id === s.font) || FONTS[0];
  const wi = Math.max(0, Math.min(4, s.weight ?? 1));
  root.style.setProperty('--font-card', font.css);
  root.style.setProperty('--w-body', WEIGHT_SCALE[wi]);
  root.style.setProperty('--w-em', WEIGHT_SCALE[Math.min(wi + 2, WEIGHT_SCALE.length - 1)]);
  root.style.setProperty('--w-meta', 200);
  root.style.setProperty('--card-fs', cardFontPx(s) + 'px');
  root.style.setProperty('--card-lh', s.lineHeight || 1.6);
  root.style.setProperty('--card-mx', (s.margin ?? 1) * 1.1 + 'em');
  root.dataset.motion = s.transition ? 'on' : 'off';
  if (!mql) {
    mql = matchMedia('(prefers-color-scheme: dark)');
    mql.addEventListener?.('change', applySettings);
  }
  const dark = s.theme === 'dark' || (s.theme === 'auto' && mql.matches);
  root.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0b0c' : '#f6f4ef');
}
