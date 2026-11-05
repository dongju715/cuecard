// 자주 쓰는 태블릿 목록입니다. 새 기기는 이 배열에 한 줄 추가하면 됩니다.
// width/height: 세로 방향 CSS 픽셀(브라우저가 쓰는 화면 크기), dpr: 화소 비율, inch: 화면 대각선(인치)
// 값은 대표 모델 기준의 근삿값입니다.
export const DEVICES = [
  { id: 'ipad-mini',   group: 'iPad',        name: 'iPad mini',            width: 744,  height: 1133, dpr: 2,   inch: 8.3 },
  { id: 'ipad',        group: 'iPad',        name: 'iPad (10.9형)',         width: 820,  height: 1180, dpr: 2,   inch: 10.9 },
  { id: 'ipad-air-11', group: 'iPad',        name: 'iPad Air 11형',         width: 820,  height: 1180, dpr: 2,   inch: 11 },
  { id: 'ipad-air-13', group: 'iPad',        name: 'iPad Air 13형',         width: 1024, height: 1366, dpr: 2,   inch: 13 },
  { id: 'ipad-pro-11', group: 'iPad',        name: 'iPad Pro 11형',         width: 834,  height: 1210, dpr: 2,   inch: 11.1 },
  { id: 'ipad-pro-13', group: 'iPad',        name: 'iPad Pro 13형',         width: 1032, height: 1376, dpr: 2,   inch: 13 },
  { id: 'tab-a9',      group: 'Galaxy Tab',  name: 'Galaxy Tab A9 (8.7형)', width: 800,  height: 1340, dpr: 1,   inch: 8.7 },
  { id: 'tab-a9p',     group: 'Galaxy Tab',  name: 'Galaxy Tab A9+ (11형)', width: 800,  height: 1280, dpr: 1.5, inch: 11 },
  { id: 'tab-s-fe',    group: 'Galaxy Tab',  name: 'Galaxy Tab S FE (10.9형)', width: 800, height: 1280, dpr: 1.8, inch: 10.9 },
  { id: 'tab-s',       group: 'Galaxy Tab',  name: 'Galaxy Tab S (11형)',    width: 800,  height: 1280, dpr: 2,   inch: 11 },
  { id: 'tab-s-plus',  group: 'Galaxy Tab',  name: 'Galaxy Tab S+ (12.4형)', width: 876,  height: 1400, dpr: 2,   inch: 12.4 },
  { id: 'tab-s-ultra', group: 'Galaxy Tab',  name: 'Galaxy Tab S Ultra (14.6형)', width: 924, height: 1480, dpr: 2, inch: 14.6 },
];

// 지금 화면을 직접 재서 기기 정보를 만듭니다. 기기 이름은 알아내지 않습니다.
export function measureThisDevice() {
  const w = Math.min(screen.width, screen.height);
  const h = Math.max(screen.width, screen.height);
  const dpr = window.devicePixelRatio || 1;
  // 크기가 같은 목록 기기가 있으면 그 대각선 값을 빌려 씁니다(크기 비교일 뿐 이름 판별이 아님).
  const same = DEVICES.find((d) => Math.abs(d.width - w) <= 4 && Math.abs(d.height - h) <= 4 && Math.abs(d.dpr - dpr) < 0.11);
  const inch = same ? same.inch : Math.round((Math.hypot(w, h) / 132) * 10) / 10; // 태블릿은 대략 1인치=132 CSS px
  return { id: 'auto', name: '이 기기 (자동 측정)', width: w, height: h, dpr, inch, measured: true };
}
