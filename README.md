# 큐카드

설교·발표·강연·축사처럼 말하는 사람이 **태블릿을 손에 들고 읽는 큐카드** 웹앱입니다.
아이패드 Safari와 안드로이드(갤럭시 탭) Chrome에서 홈 화면에 추가해 쓰는 PWA입니다.

- 서버·데이터베이스·로그인 없음. 모든 처리는 기기 안에서 합니다.
- 원고는 어디로도 전송되지 않습니다. 외부 주소에서 글꼴이나 라이브러리를 불러오지 않습니다(CSP로 막아 둠).
- 서비스 워커가 앱 전체를 기기에 저장하므로 한 번 열고 나면 인터넷 없이도 열립니다.

## 프로젝트 구조

```
cuecard/
├─ index.html                 앱 시작 파일(보안 정책·PWA 설정)
├─ vite.config.js             빌드 설정 + 서비스 워커 자동 생성
├─ public/
│  ├─ manifest.webmanifest    PWA 정보
│  ├─ icons/                  앱 아이콘(둥근 카드 한 장 모양)
│  ├─ fonts/                  ← 페이퍼로지 글꼴 파일을 넣는 곳 (fonts.css)
│  └─ pdfjs/                  pdf 읽기용 문자표(설치할 때 자동 복사)
├─ scripts/                   아이콘 만들기, pdf 문자표 복사
└─ src/
   ├─ main.js                 화면 이동(#/setup, #/home, #/import, #/edit, #/read, #/settings)
   ├─ sw-template.js          서비스 워커 틀
   ├─ data/
   │  ├─ presets.js           ← 용도별 기본값, 글꼴, 굵기
   │  └─ devices.js           ← 기기 목록
   ├─ core/
   │  ├─ settings.js          설정 저장·적용, 기기 크기 → 글자 크기 계산
   │  ├─ paginate.js          카드 나누기 핵심(실제 화면에서 재서 나눔)
   │  ├─ structure.js         글 구조(제목·번호·빈 줄·성경 구절)로 나누기
   │  ├─ runs.js              강조·성경 본문 표시가 들어간 글 형식
   │  ├─ storage.js           IndexedDB 보관함(안 되면 localStorage)
   │  └─ backup.js            백업 내보내기·불러오기, 원고 공유
   ├─ import/                 hwpx · docx · pdf · txt · md · 붙여넣기 변환
   ├─ screens/                시작 설정, 보관함, 가져오기, 편집, 읽기, 설정
   └─ styles/main.css         모든 색·굵기·크기 변수
```

프레임워크 없이 Vite(빌드 도구)와 순수 자바스크립트로 만들었습니다. 앱 자체 코드는 수십 KB이고,
큰 라이브러리(docx·pdf 읽기)는 해당 파일을 가져올 때만 불러옵니다.

## 개발과 빌드

```bash
npm install        # 처음 한 번 (라이브러리 설치 + pdf 문자표 복사)
npm run dev        # 개발용 서버
npm run build      # 배포용 결과물 → dist 폴더
```

`npm run build` 한 줄이면 `dist` 폴더에 올릴 파일이 모두 만들어집니다(서비스 워커 포함).

## 배포 — Netlify Drop (무료, 가장 쉬움)

PWA와 서비스 워커는 **https** 주소에서만 동작합니다. Netlify는 무료로 https를 붙여 줍니다.

1. 컴퓨터에서 `npm run build`를 실행합니다. `dist` 폴더가 생깁니다.
2. 브라우저에서 https://app.netlify.com/drop 에 들어갑니다(무료 가입 필요).
3. `dist` 폴더를 통째로 화면 가운데 상자에 끌어다 놓습니다.
4. 몇 초 뒤 `https://이름.netlify.app` 주소가 생깁니다. 이 주소를 태블릿에서 엽니다.
5. 사이트 설정 → *Change site name*에서 주소 이름을 바꿀 수 있습니다.
6. 고친 뒤 다시 올리려면: 다시 `npm run build` → Netlify 사이트의 *Deploys* 탭에 새 `dist` 폴더를 끌어다 놓습니다.
   태블릿에서 앱을 한 번 닫았다 열면 새 버전으로 바뀝니다.

`base: './'`로 빌드하므로 하위 경로(예: GitHub Pages의 `/cuecard/`)를 포함해 어떤 정적 호스팅에도 그대로 올릴 수 있습니다.

## 홈 화면에 추가하기

**아이패드 (Safari)**
1. Safari로 배포한 주소를 엽니다.
2. 주소창 옆 **공유** 버튼(□↑)을 누릅니다.
3. **홈 화면에 추가**를 누르고, 이름을 “큐카드”로 두고 **추가**를 누릅니다.
4. 이후에는 홈 화면의 큐카드 아이콘으로 엽니다(전체 화면으로 열림).

**갤럭시 탭 (Chrome)**
1. Chrome으로 배포한 주소를 엽니다.
2. 오른쪽 위 **⋮** 메뉴를 누릅니다.
3. **홈 화면에 추가** 또는 **앱 설치**를 누르고 **설치**를 누릅니다.

> Safari는 오래 쓰지 않은 사이트의 저장 데이터를 지울 수 있습니다. 홈 화면에 추가해 쓰고, 가끔 백업 파일을 내보내 두세요.

## 페이퍼로지 글꼴 넣기

`public/fonts/` 폴더에 글꼴 파일을 넣고 다시 빌드합니다. 파일 이름은 아래 형식이어야 합니다.

```
Paperlogy-1Thin  Paperlogy-2ExtraLight  Paperlogy-3Light  Paperlogy-4Regular  Paperlogy-5Medium
Paperlogy-6SemiBold  Paperlogy-7Bold  Paperlogy-8ExtraBold  Paperlogy-9Black
```

확장자는 `.woff2`, `.woff`, `.ttf`, `.otf` 중 아무거나 됩니다. 앱에서 쓰는 굵기는 200·300·400·500·700·800·900입니다.
파일이 없으면 자동으로 시스템 고딕으로 보입니다. 글꼴 파일도 서비스 워커가 기기에 저장해 오프라인에서 쓰입니다.

## 백업 내보내기·불러오기

- **설정 → 백업 → 내보내기**: 모든 원고와 설정을 `큐카드-백업-날짜.json` 파일 하나로 저장합니다.
  아이패드에서는 공유 시트가 열리니 “파일에 저장”을 고르세요.
- **설정 → 백업 → 불러오기**: 백업 파일을 고른 뒤
  - **합치기**: 지금 원고는 그대로 두고 백업의 원고를 더합니다(같은 원고는 더 최신 쪽을 남김).
  - **덮어쓰기**: 지금 원고와 설정을 지우고 백업 내용으로 바꿉니다.
- **원고 하나 보내기**: 보관함에서 원고의 ⋯ → **내보내기**. 받은 사람은 `.cuecard.json` 파일을 가져오기 화면에 넣으면 됩니다.
- 저장 데이터에는 버전 번호(`schema`, `version`)가 들어 있어, 앱 구조가 바뀌어도 `storage.js`의 `migrateManuscript`와
  `settings.js`의 `migrateSettings`에서 옛 데이터를 새 구조로 옮겨 읽습니다.

## 새 기기를 기기 목록에 추가하기

`src/data/devices.js`의 `DEVICES` 배열에 한 줄을 추가합니다.

```js
{ id: 'my-tab', group: 'Galaxy Tab', name: '새 태블릿 (11형)', width: 800, height: 1280, dpr: 2, inch: 11 },
```

- `width`·`height`: 세로로 들었을 때 브라우저 기준 화면 크기(CSS 픽셀). 태블릿에서 앱의 “이 기기로 자동 맞추기”를 누르면 화면에 그 값이 보입니다.
- `dpr`: 화소 비율, `inch`: 화면 대각선 인치.
- `group`이 같은 기기끼리 목록에 묶여 보입니다.

## 용도별 기본값 바꾸기

`src/data/presets.js`에서 고칩니다.

- `BASE`: 모든 용도의 공통 기본값(글꼴, 굵기, 줄 간격, 목표 시간, 카드 번호 표시 등).
- `PURPOSES`: 용도별로 `BASE`와 다른 값만 `values`에 적습니다. 예) 낭독의 줄 간격을 더 넓히려면

```js
{ id: 'reading', label: '낭독', desc: '줄 간격을 넓게, 천천히 읽기',
  values: { lineHeight: 2.1, charsPerMinute: 260, showCardNumber: false } },
```

시작 설정에서 용도를 고르거나, 설정에서 용도를 바꾸며 “기본값 적용”을 누르면 이 값이 채워집니다.

## 읽기 화면 조작

| 동작 | 결과 |
|---|---|
| 오른쪽 넓은 영역 누르기 / 왼쪽으로 쓸기 | 다음 카드 |
| 왼쪽 넓은 영역 누르기 / 오른쪽으로 쓸기 | 이전 카드(언제나 가능) |
| 가운데 길게 누르기 | 카드 전체 목록 → 원하는 카드로 이동 |
| 모서리의 희미한 동그라미 | 메뉴(글자 크기, 목록, 목표 시간, 편집, 설정, 종료) |
| 키보드·발표 리모컨 → ← PageDown PageUp 스페이스 | 다음·이전 |

왼손잡이용 넘김을 켜면 방향이 반대가 되고 메뉴 키도 왼쪽으로 옮겨집니다.

---

LIGHTUP MEDIA.
