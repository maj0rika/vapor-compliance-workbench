# Vapor Primitive Mapping

각 제품 컴포넌트가 내부에서 사용하는 Vapor primitive 와, primitive 를
직접 노출하지 않고 래핑한 이유를 정리한다.

## 매핑 표

| 제품 컴포넌트 | 사용 Vapor primitive |
| --- | --- |
| `PromptBox` | `Textarea`, `Button`, `Text` |
| `Dropzone` | `Button`, `Text`, `Callout` |
| `AttachmentItem` | `Badge`, `IconButton`, `Tooltip`, `Spinner`, `Text` |
| `AttachmentList` | `Text` (+ `AttachmentItem`) |
| `DataSourceSelector` | `Select`, `MultiSelect`, `Text` |

아이콘은 `@vapor-ui/icons` 의 `CloseOutlineIcon` 을 사용한다.

## 래핑 이유

### 1. 제품 언어로 된 API

Vapor 의 `Textarea` 는 `onValueChange(value, eventDetails)` 시그니처를,
`Select` 는 compound 패턴(`Select.Root` / `Select.Trigger` / `Select.Item`)을
가진다. 제품 컴포넌트는 이를 감춰 `value` / `onSubmit` / `selected` /
`onChange` 같은 제품 요구사항 중심 API 만 노출한다.

### 2. 동작·검증 로직의 단일화

Enter 제출, IME 조합 처리, maxLength 초과 판정, 파일 accept/size 검증 같은
로직을 제품 컴포넌트 레이어에 모은다. 앱은 동일한 동작을 매번 다시
구현하지 않는다.

### 3. Vapor API 변경의 격리

Vapor primitive 의 props 가 바뀌어도 수정 범위가 제품 컴포넌트 레이어
(`src/components/prompt/**`)로 한정된다. 앱 레이어는 영향을 받지 않는다.

### 4. 접근성 보강 지점의 고정

Vapor 가 제공하는 기본 접근성 위에, 합성 과정에서 깨질 수 있는 부분
(IconButton 의 `aria-label`, 제출 버튼 라벨, 상태 `aria-live` 등)을
제품 컴포넌트에서 일관되게 보강한다. 자세한 내용은
[accessibility-checklist.md](./accessibility-checklist.md) 참고.

## 경계 강제

앱 레이어(`src/app/**`)는 `@vapor-ui/core` 를 직접 import 할 수 없다.
이 규칙은 ESLint `no-restricted-imports` 로 강제되며, 위반 시 lint 가
실패한다. 구조적 배경은 [architecture.md](./architecture.md) 참고.
