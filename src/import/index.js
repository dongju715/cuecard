// 파일 가져오기. 모든 변환은 브라우저 안에서만 합니다(외부 서버 없음).
import { textToBlocks, markdownToBlocks } from './text.js';
import { htmlToBlocks, cleanBlocks } from './html.js';

export class ImportError extends Error {
  constructor(kind, message) { super(message); this.kind = kind; }
}

export const ACCEPT = '.hwpx,.hwp,.docx,.txt,.md,.markdown,.pdf,.json,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const decodeText = (buf) => {
  const u8 = new Uint8Array(buf);
  try { return new TextDecoder('utf-8', { fatal: true }).decode(u8); }
  catch { try { return new TextDecoder('euc-kr').decode(u8); } catch { return new TextDecoder().decode(u8); } }
};

export async function importFile(file) {
  const name = file.name || '';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const buf = await file.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 8));
  const isOle = head[0] === 0xd0 && head[1] === 0xcf && head[2] === 0x11 && head[3] === 0xe0;
  const isZip = head[0] === 0x50 && head[1] === 0x4b;
  const base = name.replace(/\.[^.]+$/, '');

  if (ext === 'hwp' || (isOle && ext !== 'doc')) throw new ImportError('hwp', '옛 한글(hwp) 형식입니다.');
  if (ext === 'doc' || isOle) throw new ImportError('doc', '옛 워드(doc) 형식입니다.');
  if (ext === 'json') return { json: JSON.parse(decodeText(buf)) };

  let blocks;
  if (ext === 'hwpx' || (isZip && ext !== 'docx' && (await looksHwpx(buf)))) {
    const { readHwpx } = await import('./hwpx.js');
    blocks = await readHwpx(buf);
  } else if (ext === 'docx' || isZip) {
    const { readDocx } = await import('./docx.js');
    blocks = await readDocx(buf);
  } else if (ext === 'pdf' || (head[0] === 0x25 && head[1] === 0x50)) {
    const { readPdf } = await import('./pdf.js');
    blocks = await readPdf(buf);
  } else if (ext === 'md' || ext === 'markdown') {
    blocks = markdownToBlocks(decodeText(buf));
  } else if (ext === 'txt' || !ext || file.type.startsWith('text/')) {
    blocks = textToBlocks(decodeText(buf));
  } else {
    throw new ImportError('unsupported', `${ext} 형식은 아직 읽을 수 없습니다.`);
  }
  blocks = cleanBlocks(blocks);
  if (!blocks.length) throw new ImportError('empty', '파일에서 글을 찾지 못했습니다.');
  return { blocks, name: base };
}

async function looksHwpx(buf) {
  const { unzipSync } = await import('fflate');
  try { const z = unzipSync(new Uint8Array(buf), { filter: (f) => f.name === 'mimetype' }); return new TextDecoder().decode(z.mimetype || new Uint8Array()).includes('hwp'); }
  catch { return false; }
}

// 붙여넣기: 서식 있는 글이 있으면 제목·굵은 글자를 살립니다.
export function importPaste({ html, text }) {
  if (html && /<(p|div|h[1-6]|b|strong|span|li|br)\b/i.test(html)) {
    const blocks = htmlToBlocks(html);
    if (blocks.length) return blocks;
  }
  const t = text || '';
  return /^#{1,6}\s|\*\*.+\*\*/m.test(t) ? markdownToBlocks(t) : textToBlocks(t);
}
