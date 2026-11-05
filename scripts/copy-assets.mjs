// pdf.js의 CJK 문자표(cmaps)와 표준 글꼴을 public 폴더로 복사해서 오프라인에서도 쓰게 합니다.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
const src = 'node_modules/pdfjs-dist';
if (existsSync(src)) {
  mkdirSync('public/pdfjs', { recursive: true });
  cpSync(`${src}/cmaps`, 'public/pdfjs/cmaps', { recursive: true });
  cpSync(`${src}/standard_fonts`, 'public/pdfjs/standard_fonts', { recursive: true });
}
