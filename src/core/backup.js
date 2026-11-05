// 원고 만들기, 백업 내보내기·불러오기, 개별 원고 공유
import { uid, saveManuscript, listManuscripts, deleteManuscript, migrateManuscript, DATA_VERSION, getManuscript } from './storage.js';
import { getSettings, saveSettings, migrateSettings } from './settings.js';
import { makeCards, guessTitle } from './structure.js';
import { charCount } from './runs.js';
import { download } from './ui.js';

export function newManuscript(blocks, title) {
  const s = getSettings();
  const now = Date.now();
  return {
    id: uid(), version: DATA_VERSION, title: title || guessTitle(blocks), purpose: s.purpose || 'custom',
    createdAt: now, updatedAt: now, lastOpened: null,
    source: blocks,               // 원본 글은 따로 보관해서 카드 나누기를 처음부터 다시 할 수 있게 합니다.
    cards: makeCards(blocks),
    position: { cardId: null, offset: 0 },
    timer: { start: null, minutes: s.targetMinutes },
  };
}

export const manuscriptChars = (m) => m.cards.reduce((a, c) => a + charCount(c.runs), 0);

const stamp = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`; };
const safe = (s) => s.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 40);

export async function exportBackup() {
  const data = { app: 'cuecard', kind: 'backup', schema: DATA_VERSION, exportedAt: new Date().toISOString(), settings: getSettings(), manuscripts: await listManuscripts() };
  download(`큐카드-백업-${stamp()}.json`, JSON.stringify(data));
}

export async function exportOne(id) {
  const m = await getManuscript(id);
  const copy = { ...m, position: { cardId: null, offset: 0 }, timer: { start: null, minutes: m.timer?.minutes } };
  const data = { app: 'cuecard', kind: 'manuscript', schema: DATA_VERSION, exportedAt: new Date().toISOString(), manuscript: copy };
  download(`${safe(m.title)}.cuecard.json`, JSON.stringify(data));
}

// mode: 'merge'(합치기) | 'replace'(덮어쓰기)
export async function importJSON(data, mode = 'merge') {
  if (!data || data.app !== 'cuecard') throw new Error('큐카드 백업 파일이 아닙니다.');
  if (data.kind === 'manuscript') {
    const m = migrateManuscript({ ...data.manuscript, id: uid(), lastOpened: null });
    await saveManuscript(m);
    return { count: 1, id: m.id };
  }
  const list = (data.manuscripts || []).map(migrateManuscript);
  if (mode === 'replace') {
    for (const m of await listManuscripts()) await deleteManuscript(m.id);
    if (data.settings) saveSettings({ ...migrateSettings(data.settings), setupDone: true });
  }
  const existing = new Set((await listManuscripts()).map((m) => m.id));
  let count = 0;
  for (const m of list) {
    if (mode === 'merge' && existing.has(m.id)) {
      const cur = await getManuscript(m.id);
      if ((cur.updatedAt || 0) >= (m.updatedAt || 0)) continue; // 기기 쪽이 더 최신이면 유지
    }
    if (await saveManuscript(m)) count++;
  }
  return { count };
}
