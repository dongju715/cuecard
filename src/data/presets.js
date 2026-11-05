// 용도별 기본값입니다. 여기 값을 고치면 시작 설정에서 용도를 고를 때 미리 채워지는 값이 바뀝니다.
// 적지 않은 항목은 BASE 값을 따릅니다.
export const BASE = {
  font: 'paperlogy',      // paperlogy | gothic | myeongjo | rounded
  weight: 1,              // 0 가는, 1 보통, 2 중간, 3 굵게, 4 가장 굵게
  theme: 'auto',          // light | dark | auto
  fontScale: 1,           // 글자 크기 배율 (기기에 맞춘 크기 × 배율)
  lineHeight: 1.6,        // 줄 간격
  margin: 1,              // 좌우 여백 배율
  verseHighlight: false,  // 성경 본문 강조
  timer: false,           // 목표 시간 안내
  targetMinutes: 30,      // 목표 분
  showCardNumber: true,   // 카드 번호 표시
  showProgress: true,     // 진행 막대 표시
  showNotes: true,        // 메모 표시
  transition: true,       // 넘김 전환 효과
  leftHanded: false,      // 넘김 방향 바꾸기
  charsPerMinute: 320,    // 예상 낭독 시간 계산용(공백 제외 글자/분)
};

export const PURPOSES = [
  { id: 'sermon',  label: '설교', desc: '성경 본문 강조와 목표 시간 안내',
    values: { verseHighlight: true, timer: true, targetMinutes: 35, theme: 'dark' } },
  { id: 'present', label: '발표', desc: '카드 번호와 목표 시간 안내',
    values: { showCardNumber: true, timer: true, targetMinutes: 15 } },
  { id: 'lecture', label: '강연', desc: '긴 원고를 편하게, 목표 시간 안내',
    values: { timer: true, targetMinutes: 50, lineHeight: 1.65 } },
  { id: 'speech',  label: '축사와 인사말', desc: '짧은 원고를 크고 또렷하게',
    values: { fontScale: 1.1, showProgress: false, targetMinutes: 5 } },
  { id: 'reading', label: '낭독', desc: '줄 간격을 넓게, 천천히 읽기',
    values: { lineHeight: 1.95, charsPerMinute: 260, showCardNumber: false } },
  { id: 'custom',  label: '직접 설정', desc: '모든 값을 직접 고릅니다', values: {} },
];

export function presetFor(id) {
  const p = PURPOSES.find((x) => x.id === id) || PURPOSES[PURPOSES.length - 1];
  return { ...BASE, ...p.values };
}
export const purposeLabel = (id) => (PURPOSES.find((p) => p.id === id) || {}).label || '기타';

export const FONTS = [
  { id: 'paperlogy', label: '페이퍼로지', css: "'Paperlogy', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', system-ui, sans-serif" },
  { id: 'gothic',    label: '시스템 고딕', css: "-apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Noto Sans CJK KR', 'Malgun Gothic', system-ui, sans-serif" },
  { id: 'myeongjo',  label: '시스템 명조', css: "'AppleMyungjo', 'Nanum Myeongjo', 'Noto Serif KR', 'Noto Serif CJK KR', 'Batang', serif" },
  { id: 'rounded',   label: '시스템 둥근 글꼴', css: "ui-rounded, 'SF Pro Rounded', 'NanumSquareRound', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif" },
];

// 굵기 단계. 본문=사용자 선택, 강조=본문보다 두 단계 굵게, 번호·진행=가장 가늘게
export const WEIGHTS = [
  { label: '가는', value: 300 }, { label: '보통', value: 400 }, { label: '중간', value: 500 },
  { label: '굵게', value: 700 }, { label: '가장 굵게', value: 800 },
];
export const WEIGHT_SCALE = [300, 400, 500, 700, 800, 900];

export const SAMPLE = '하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니, 오늘 우리는 그 사랑을 이야기합니다.';
