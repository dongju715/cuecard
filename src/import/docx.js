// docx 읽기: 제목 스타일·굵게·목록 정보를 살립니다(mammoth를 앱에 포함해 오프라인으로 변환).
import mammoth from 'mammoth/mammoth.browser.js';
import { htmlToBlocks } from './html.js';

export async function readDocx(buf) {
  const { value } = await mammoth.convertToHtml({ arrayBuffer: buf }, {
    styleMap: [
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='제목'] => h1:fresh",
      "p[style-name^='제목 '] => h2:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "p[style-name='Quote'] => blockquote:fresh",
      "p[style-name='인용'] => blockquote:fresh",
    ],
    convertImage: mammoth.images.imgElement(() => Promise.resolve({ src: '' })),
    ignoreEmptyParagraphs: false,
  });
  return htmlToBlocks(value);
}
