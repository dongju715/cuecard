import './styles/main.css';
import { loadSettings, applySettings, isSetUp } from './core/settings.js';
import { requestPersist } from './core/storage.js';

loadSettings();
applySettings();
requestPersist();

const app = document.getElementById('app');
let cleanup = null;

// 화면 주소: #/setup, #/home, #/import, #/edit/ID, #/read/ID, #/settings
const routes = {
  setup: () => import('./screens/onboarding.js'),
  home: () => import('./screens/library.js'),
  import: () => import('./screens/importer.js'),
  edit: () => import('./screens/editor.js'),
  read: () => import('./screens/reader.js'),
  settings: () => import('./screens/settings.js'),
};

export function go(path) { location.hash = '#/' + path; }

async function render() {
  let [name, arg] = location.hash.replace(/^#\/?/, '').split('/');
  if (!isSetUp() && name !== 'setup') name = 'setup';
  if (!routes[name]) name = 'home';
  let mod;
  try {
    mod = await routes[name]();
    sessionStorage.removeItem('cq-retry');
  } catch (err) {
    // 화면 파일을 못 불러오면(예전 버전이 남은 경우) 한 번 새로 고칩니다.
    if (!sessionStorage.getItem('cq-retry')) { sessionStorage.setItem('cq-retry', '1'); location.reload(); return; }
    document.getElementById('splash')?.remove(); document.documentElement.classList.remove('splashing');
    app.innerHTML = '<div style="padding:40px 24px;text-align:center;font-size:17px;line-height:1.6">화면을 불러오지 못했습니다.<br>인터넷에 연결한 뒤 앱을 닫았다가 다시 열어 주세요.</div>';
    const b = document.createElement('button'); b.className = 'btn primary big'; b.textContent = '다시 열기'; b.onclick = () => location.reload();
    app.firstChild.append(document.createElement('br'), b);
    return;
  }
  if (cleanup) { try { cleanup(); } catch { /* 무시 */ } cleanup = null; }
  app.innerHTML = '';
  document.body.dataset.screen = name;
  window.scrollTo(0, 0);
  cleanup = (await mod.default(app, arg ? decodeURIComponent(arg) : null)) || null;
}

window.addEventListener('hashchange', render);
render();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // 새 버전을 받으면 한 번만 다시 열어서 바로 반영합니다(예전 화면이 남지 않도록).
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return;
    reloaded = true; location.reload();
  });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch(() => {});
}

// 시작 화면: 애니메이션이 끝나면 치웁니다. 화면을 누르면 바로 넘어갑니다.
const splash = document.getElementById('splash');
if (splash) {
  // 사라지기 시작할 때 뒤의 화면을 보여 줘서 자연스럽게 겹쳐 바뀌게 합니다.
  const reveal = () => {
    const root = document.documentElement;
    root.classList.remove('splashing');
    if (root.dataset.themeColor) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', root.dataset.themeColor);
  };
  const done = () => { reveal(); splash.remove(); };
  splash.addEventListener('animationstart', (e) => { if (e.target === splash && e.animationName === 'sp-out') reveal(); });
  splash.addEventListener('animationend', (e) => { if (e.target === splash) done(); });
  splash.addEventListener('pointerdown', done, { once: true });
  setTimeout(done, 4000);
}
