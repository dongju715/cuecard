// 큐카드 로고 (C1: 넘길 다음 장 + 큐 마크). 외부 파일 없이 SVG 문자열로 씁니다.
export const LOGO_ORANGE = '#F26135';
export const LOGO_INK = '#0E0E0E';
export const LOGO_PAPER = '#F4EFE6';

// small: 작은 크기에서는 원고 줄을 하나로 줄입니다.
export function logoMark({ size = 32, small = size < 40 } = {}) {
  const lines = small
    ? `<rect x="76" y="140" width="76" height="10" rx="5" class="logo-line" fill="${LOGO_PAPER}"/>`
    : `<rect x="76" y="136" width="76" height="7" rx="3.5" class="logo-line" fill="${LOGO_PAPER}"/><rect x="76" y="154" width="46" height="7" rx="3.5" class="logo-line" fill="${LOGO_PAPER}" opacity=".5"/>`;
  return `<svg class="logo-mark" width="${size}" height="${size}" viewBox="48 30 150 172" aria-hidden="true" focusable="false">`
    + `<rect x="70" y="40" width="112" height="140" rx="14" fill="${LOGO_ORANGE}" transform="rotate(8 126 110)"/>`
    + `<rect x="58" y="54" width="112" height="140" rx="14" fill="${LOGO_INK}" class="logo-card"/>`
    + `<circle cx="148" cy="76" r="${small ? 12 : 9}" fill="${LOGO_ORANGE}"/>${lines}</svg>`;
}
