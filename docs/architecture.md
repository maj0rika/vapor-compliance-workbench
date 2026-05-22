# Architecture

## 개요

이 프로젝트는 AI 챗 프롬프트 입력 영역을 하나의 화면이 아니라 재사용 가능한
**제품 컴포넌트 레이어(Product Component Layer)** 로 설계한다.

## 레이어 구조

```
@vapor-ui/core          ← 디자인시스템 primitive
        ↓
Product Component Layer ← src/components/prompt/**
        ↓
Demo App                ← src/app/**
```

각 레이어의 책임은 다음과 같다.

| 레이어 | 위치 | 책임 |
| --- | --- | --- |
| Vapor primitive | `@vapor-ui/core` | 접근성·테마·스타일을 갖춘 기본 UI 단위 |
| Product Component Layer | `src/components/prompt/**` | Vapor primitive를 제품 요구사항에 맞게 합성·래핑 |
| Demo App | `src/app/**` | 제품 컴포넌트를 조립해 실제 사용 흐름을 구성 |

## Vapor primitive와 제품 컴포넌트의 책임 분리

앱 레이어는 `@vapor-ui/core`를 직접 import하지 않는다. Vapor primitive는
오직 제품 컴포넌트 레이어 내부에서만 사용된다.

- `src/components/prompt/**` → `@vapor-ui/core` import 허용
- `src/app/**` → `@vapor-ui/core` import 금지

이 경계는 문서 권고가 아니라 ESLint `no-restricted-imports` 규칙으로 강제한다.

### 분리의 목적

- Vapor API 변경 시 수정 범위를 제품 컴포넌트 레이어로 한정
- 제품 전반의 UI 사용 패턴을 일관화
- 접근성·상태·검증 로직을 단일 지점에서 관리
- 디자인시스템 primitive와 제품 컴포넌트의 책임을 명확히 구분

## 스타일링

스타일은 Tailwind CSS v4와 Vapor UI의 Tailwind 프리셋을 함께 사용한다.

- `@vapor-ui/core/tailwind.css` 프리셋이 Vapor 디자인 토큰을 `v-` 접두사
  유틸리티(`bg-v-primary`, `gap-v-200` 등)로 노출한다.
- CSS `@layer` 우선순위는 `tw-theme → vapor → tw-utilities` 순서로,
  Tailwind 유틸리티가 가장 높은 우선순위를 가진다.
- Vapor 가 자체 CSS reset 을 포함하므로 Tailwind preflight 는 사용하지 않는다.
- 레이아웃·간격 등 제품 스타일은 컴포넌트 레이어에서 Tailwind 유틸리티로만
  관리하고, 앱 레이어에는 스타일 책임을 두지 않는다.

## 컴포넌트 구성

```
PromptBar
├─ PromptBox          프롬프트 입력 · 제출 · 글자수
├─ Dropzone           파일 드래그&드롭 / 클릭 업로드
├─ AttachmentList     첨부 목록
│  └─ AttachmentItem  개별 첨부 상태 (uploading / done / error)
└─ DataSourceSelector 데이터소스 선택 (단일 / 다중)
```

## Props 설계 원칙

Vapor primitive의 props를 그대로 외부로 노출하지 않는다. 제품 컴포넌트의
공개 API는 Vapor 내부 구조와 무관하게 제품 언어(`value`, `onSubmit`,
`maxLength`, `disabled`, `status` 등)로 정의한다. 앱은 Vapor를 몰라도
제품 컴포넌트를 사용할 수 있어야 한다.
