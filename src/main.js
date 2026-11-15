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
  const mod = await routes[name]();
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
  const done = () => splash.remove();
  splash.addEventListener('animationend', (e) => { if (e.target === splash) done(); });
  splash.addEventListener('pointerdown', done, { once: true });
  setTimeout(done, 4000);
}
