// 서식 있는 글(HTML)을 문단 구조로 바꿉니다. 붙여넣기(노션·한글·웹)와 docx에서 함께 씁니다.
// blocks: [{ type: 'h'|'p'|'li'|'quote'|'blank', runs: [{ t, b }], ordered? }]

const BLOCK = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'TR', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'PRE', 'TABLE', 'UL', 'OL', 'DT', 'DD', 'FIGURE']);
const SKIP = new Set(['SCRIPT', 'STYLE', 'META', 'LINK', 'TITLE', 'HEAD', 'NOSCRIPT', 'TEMPLATE', 'IMG', 'SVG', 'IFRAME', 'OBJECT']);

function isBold(el) {
  if (/^(B|STRONG)$/.test(el.tagName)) return true;
  const st = el.getAttribute?.('style') || '';
  const m = st.match(/font-weight\s*:\s*(bold|bolder|[6-9]00)/i);
  return !!m;
}
function headingLevel(el) {
  const m = el.tagName.match(/^H([1-6])$/);
  if (m) return +m[1];
  const st = el.getAttribute?.('style') || '';
  const fs = st.match(/font-size\s*:\s*([\d.]+)(pt|px)/i);
  if (fs) { const px = fs[2] === 'pt' ? +fs[1] * 1.333 : +fs[1]; if (px >= 21) return 2; }
  const cls = el.className && String(el.className);
  if (/heading|title|제목|개요/i.test(cls)) return 2;
  return 0;
}

export function htmlToBlocks(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = [];
  let cur = null;
  const start = (type, extra = {}) => { cur = { type, runs: [], ...extra }; blocks.push(cur); };
  const end = () => { cur = null; };
  const push = (t, b) => {
    if (!t) return;
    if (!cur) start('p');
    const last = cur.runs[cur.runs.length - 1];
    if (last && !!last.b === !!b) last.t += t; else cur.runs.push({ t, b: !!b });
  };

  function walk(node, bold, ctx) {
    if (node.nodeType === 3) { push(node.nodeValue.replace(/[\r\n\t]+/g, ' ').replace(/ /g, ' '), bold); return; }
    if (node.nodeType !== 1 || SKIP.has(node.tagName)) return;
    const tag = node.tagName;
    if (tag === 'BR') { if (cur) push('\n', false); else blocks.push({ type: 'blank', runs: [] }); return; }
    const b = bold || isBold(node);
    if (BLOCK.has(tag)) {
      end();
      const lvl = headingLevel(node);
      const isList = tag === 'LI';
      const hasBlockKids = [...node.children].some((c) => BLOCK.has(c.tagName));
      if (!hasBlockKids || isList) {
        start(lvl ? 'h' : isList ? 'li' : tag === 'BLOCKQUOTE' || ctx.quote ? 'quote' : 'p', isList ? { ordered: ctx.ordered } : {});
      }
      const nctx = { ordered: tag === 'OL' ? true : tag === 'UL' ? false : ctx.ordered, quote: ctx.quote || tag === 'BLOCKQUOTE' };
      if (isList && nctx.ordered) { ctx.n = (ctx.n || 0) + 1; push(`${ctx.n}. `, false); }
      const child = tag === 'OL' || tag === 'UL' ? { ...nctx, n: 0 } : nctx;
      node.childNodes.forEach((c) => walk(c, b || lvl > 0, child));
      end();
      return;
    }
    node.childNodes.forEach((c) => walk(c, b, ctx));
  }
  walk(doc.body, false, {});
  return cleanBlocks(blocks);
}

// 앞뒤 공백 정리, 빈 문단은 빈 줄로
export function cleanBlocks(blocks) {
  const out = [];
  for (const b of blocks) {
    const runs = b.runs.map((r) => ({ ...r, t: r.t.replace(/ {2,}/g, ' ') })).filter((r) => r.t);
    if (runs.length) { runs[0].t = runs[0].t.replace(/^\s+/, ''); const l = runs[runs.length - 1]; l.t = l.t.replace(/\s+$/, ''); }
    const text = runs.map((r) => r.t).join('');
    if (!text.trim()) { if (out.length && out[out.length - 1].type !== 'blank') out.push({ type: 'blank', runs: [] }); continue; }
    out.push({ ...b, runs: runs.filter((r) => r.t) });
  }
  while (out.length && out[out.length - 1].type === 'blank') out.pop();
  return out;
}
