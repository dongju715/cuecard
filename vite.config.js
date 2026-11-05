import { defineConfig } from 'vite';
import { readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// 빌드가 끝나면 dist 안의 모든 파일 목록으로 서비스 워커(sw.js)를 만듭니다.
function serviceWorkerPlugin() {
  return {
    name: 'cuecard-sw',
    apply: 'build',
    closeBundle() {
      const dist = 'dist';
      const files = [];
      const walk = (dir) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(dist, p).split('\\').join('/'));
        }
      };
      walk(dist);
      const list = files.filter((f) => f !== 'sw.js' && !f.endsWith('.txt') && !f.split('/').pop().startsWith('.'));
      const version = Date.now().toString(36);
      const tpl = readFileSync('src/sw-template.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__FILES__', JSON.stringify(['./', ...list]));
      writeFileSync(join(dist, 'sw.js'), tpl);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorkerPlugin()],
  build: { target: ['safari15', 'chrome100'], chunkSizeWarningLimit: 2000 },
  server: { host: true },
  preview: { host: true, port: 4173, allowedHosts: true },
});
