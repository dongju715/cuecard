// 원고 보관함. IndexedDB를 쓰고, 안 되면 localStorage로 대체합니다.
// 모든 데이터는 기기 안에만 저장되며 외부로 보내지 않습니다.
import { toast } from './ui.js';

export const DATA_VERSION = 1;
const DB = 'cuecard';
const STORE = 'manuscripts';
const LS_KEY = 'cuecard.manuscripts';

let dbp = null;
let useLS = false;

function openDB() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('no idb'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).catch((e) => { useLS = true; throw e; });
  return dbp;
}

const lsAll = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
const lsWrite = (arr) => localStorage.setItem(LS_KEY, JSON.stringify(arr));

async function tx(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const st = t.objectStore(STORE);
    const r = fn(st);
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

// 옛 버전 원고를 지금 구조로 옮깁니다.
export function migrateManuscript(m) {
  const v = m.version || 1;
  if (v < 1) { /* 구조가 바뀌면 여기에 변환 코드를 추가합니다 */ }
  m.version = DATA_VERSION;
  m.cards = (m.cards || []).map((c) => ({ id: c.id || uid(), runs: c.runs || [{ t: c.text || '' }], note: c.note || '', cont: !!c.cont }));
  m.position = m.position || { cardId: null, offset: 0 };
  return m;
}

export async function listManuscripts() {
  let arr;
  try { arr = useLS ? lsAll() : await tx('readonly', (s) => s.getAll()); }
  catch { useLS = true; arr = lsAll(); }
  return arr.map(migrateManuscript).sort((a, b) => (b.lastOpened || b.updatedAt || 0) - (a.lastOpened || a.updatedAt || 0));
}

export async function getManuscript(id) {
  let m;
  try { m = useLS ? lsAll().find((x) => x.id === id) : await tx('readonly', (s) => s.get(id)); }
  catch { useLS = true; m = lsAll().find((x) => x.id === id); }
  return m ? migrateManuscript(m) : null;
}

export async function saveManuscript(m, { quiet = false } = {}) {
  m.version = DATA_VERSION;
  m.updatedAt = Date.now();
  const plain = JSON.parse(JSON.stringify(m));
  try {
    if (!useLS) { await tx('readwrite', (s) => s.put(plain)); return true; }
  } catch { useLS = true; }
  try {
    const arr = lsAll().filter((x) => x.id !== m.id);
    arr.push(plain); lsWrite(arr);
    return true;
  } catch {
    if (!quiet) toast('저장하지 못했습니다. 기기 저장 공간이 부족하거나 저장이 막혀 있습니다. 설정에서 백업 파일을 내보내 두세요.', 'error', 6000);
    return false;
  }
}

export async function deleteManuscript(id) {
  try { if (!useLS) { await tx('readwrite', (s) => s.delete(id)); return; } } catch { useLS = true; }
  try { lsWrite(lsAll().filter((x) => x.id !== id)); } catch { toast('삭제하지 못했습니다.', 'error'); }
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// 기기에 저장된 데이터가 지워지지 않도록 브라우저에 요청합니다(가능한 경우).
export function requestPersist() {
  navigator.storage?.persist?.().catch(() => {});
}
