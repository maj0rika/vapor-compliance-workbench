# Accessibility Checklist

Vapor 가 제공하는 기본 접근성 위에, 합성 컴포넌트 레이어에서 깨질 수 있는
부분을 별도로 점검한다. 각 항목은 테스트 또는 lint 로 검증된다.

## 라벨링

- [x] 첨부 제거 `IconButton` 에 `aria-label` 제공 (`{파일명} 첨부 제거`)
      — `eslint-plugin-vapor` 의 `icon-button-has-aria-label` 규칙으로 강제
- [x] `PromptBox` 제출 버튼에 명확한 라벨 제공 (`submitLabel`)
- [x] 프롬프트 `Textarea` 에 `aria-label`("프롬프트 입력") 제공
- [x] 데이터소스 선택 트리거에 `aria-label`("데이터소스 선택") 제공
- [x] 파일 선택 버튼에 `aria-label`("파일 선택") 제공

## 키보드 조작

- [x] Enter 로 제출, Shift+Enter 로 줄바꿈 구분
      — 단위 테스트 + E2E 로 검증
- [x] IME 조합 중 Enter 는 제출하지 않음 (한글 입력 안전)
- [x] ESC 로 열린 데이터소스 메뉴 닫힘 — E2E 로 검증
- [x] Dropzone 은 클릭뿐 아니라 키보드로 파일 대화상자 열기 가능
      — 파일 선택 버튼이 포커스 가능하며 Enter 로 동작 (E2E 검증)
- [x] 숨김 `<input type="file">` 은 `tabIndex=-1` 로 탭 순회에서 제외하고,
      포커스는 버튼으로 단일화
- [x] 데이터소스 → 파일 선택 → 프롬프트 입력 순으로 Tab 이동 가능
      — E2E 로 포커스 순서 검증

## 상태 피드백

- [x] 업로드 중 첨부 항목에 `aria-busy="true"` 설정
- [x] 첨부 에러 메시지는 `role="alert"` 로 전달
- [x] 잘못된 파일 거부 피드백(Callout)은 `role="alert"` 로 전달
- [x] 글자수 표시는 `aria-live="polite"` 로 안내
- [x] 데이터소스 선택 요약은 `aria-live="polite"` 로 안내
- [x] 긴 파일명은 말줄임 처리하고 Tooltip 으로 전체 이름 노출

## 자동 검증

- `eslint-plugin-jsx-a11y` (recommended) — 일반 JSX 접근성 규칙
- `eslint-plugin-vapor` — Vapor 컴포넌트 전용 접근성 규칙
- Playwright E2E — 키보드 흐름, 포커스 순서, ESC 닫힘 검증

`npm run lint` 와 `npm run test:e2e` 로 회귀를 방지한다.
