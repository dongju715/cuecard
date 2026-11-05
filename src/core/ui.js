// 작은 화면 그리기 도우미들
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastWrap;
export function toast(msg, kind = 'info', ms = 3200) {
  if (!toastWrap) { toastWrap = h('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(toastWrap); }
  const t = h('div', { class: 'toast ' + kind }, msg);
  toastWrap.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

// 아래에서 올라오는 시트. 한 손으로 쓰기 좋게 버튼은 아래쪽에 둡니다.
export function sheet(title, body, { actions = [], onClose } = {}) {
  const close = () => { wrap.classList.add('closing'); setTimeout(() => wrap.remove(), 180); onClose && onClose(); };
  const wrap = h('div', { class: 'sheet-wrap', onclick: (e) => { if (e.target === wrap) close(); } },
    h('div', { class: 'sheet', role: 'dialog', 'aria-label': title },
      h('div', { class: 'sheet-head' }, h('h2', {}, title), h('button', { class: 'icon-btn', 'aria-label': '닫기', onclick: close }, '✕')),
      h('div', { class: 'sheet-body' }, body),
      actions.length ? h('div', { class: 'sheet-actions' }, actions.map((a) =>
        h('button', { class: 'btn ' + (a.kind || ''), onclick: async () => { const r = await a.run?.(); if (r !== false) close(); } }, a.label))) : null));
  document.body.append(wrap);
  return { close, el: wrap };
}

export function confirmSheet(title, msg, okLabel = '확인', kind = 'danger') {
  return new Promise((res) => {
    let done = false;
    sheet(title, h('p', { class: 'muted' }, msg), {
      actions: [{ label: '취소', run: () => { done = true; res(false); } }, { label: okLabel, kind, run: () => { done = true; res(true); } }],
      onClose: () => { if (!done) res(false); },
    });
  });
}

export function promptSheet(title, value = '', okLabel = '확인') {
  return new Promise((res) => {
    const input = h('input', { class: 'input', value, type: 'text' });
    let done = false;
    sheet(title, input, {
      actions: [{ label: '취소', run: () => { done = true; res(null); } }, { label: okLabel, kind: 'primary', run: () => { done = true; res(input.value.trim()); } }],
      onClose: () => { if (!done) res(null); },
    });
    setTimeout(() => input.focus(), 50);
  });
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const file = new File([blob], filename, { type });
  if (navigator.canShare?.({ files: [file] }) && /iPad|iPhone|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document) {
    navigator.share({ files: [file], title: filename }).catch(() => {});
    return;
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function pickFile(accept) {
  return new Promise((res) => {
    const i = h('input', { type: 'file', accept, style: { display: 'none' } });
    i.onchange = () => { res(i.files[0] || null); i.remove(); };
    document.body.append(i); i.click();
  });
}

export const fmtDate = (t) => {
  if (!t) return '—';
  const d = new Date(t);
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
};
export const fmtMin = (chars, cpm) => {
  const m = Math.max(1, Math.round(chars / (cpm || 320)));
  return m >= 60 ? `약 ${Math.floor(m / 60)}시간 ${m % 60}분` : `약 ${m}분`;
};
