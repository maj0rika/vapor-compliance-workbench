# Architecture

## 개요

이 프로젝트는 Vapor Design System 기반 반복 작업을 자연어 에이전트로 자동화하는
케이스 스터디다. 사용자는 DS 작업 요청과 참고 파일을 입력하고, 에이전트는
컴포넌트, Storybook story, Vitest test, 접근성/token notes 를 생성한다.

중요한 구조 원칙은 세 가지다.

- Vite config 는 dev server wiring 만 담당한다.
- prompt builder, artifact parser, token checker 는 `src/agent/**` 의 순수 모듈로
  분리한다.
- 브라우저는 same-origin API 만 호출하고 DeepSeek API key 는 서버 프록시에서만
  읽는다.

## 레이어 구조

```txt
@vapor-ui/core              ← 디자인시스템 primitive
        ↓
Product Component Layer     ← src/components/prompt/**, src/components/chat/**
        ↓
Demo App                    ← src/app/**

src/agent/**                ← AgentClient, prompt builder, parser, token checker
server/deepseek/**          ← 서버 전용 DeepSeek proxy
```

| 레이어 | 위치 | 책임 |
| --- | --- | --- |
| Vapor primitive | `@vapor-ui/core` | 접근성·테마·스타일을 갖춘 기본 UI 단위 |
| Product Component Layer | `src/components/**` | Vapor primitive 를 제품 요구사항에 맞게 합성·래핑 |
| Demo App | `src/app/**` | 제품 컴포넌트를 조립해 실제 화면을 구성 |
| Agent Core | `src/agent/**` | 클라이언트 계약, prompt 구성, SSE/parser/token check |
| Server Proxy | `server/deepseek/**` | API key 보호, DeepSeek payload 구성, stream forwarding |

## Agent Flow

```txt
PromptBar submit
  → AgentRequest { text, mode, attachments }
  → DeepSeekAgentClient / MockAgentClient
  → server/deepseek/chatProxy.ts
  → buildDeepSeekPayload()
  → DeepSeek stream
  → token events
  → parseGeneratedArtifact() after completion
  → artifactToMarkdown()
  → checkTokenUsage()
  → PreviewPanel tabs + validation badges
```

생성과 검증은 분리한다. streaming 중에는 사용자에게 즉시 토큰을 보여주고, 응답이
완성된 뒤 artifact 를 파싱해 preview 와 token usage check 를 갱신한다.

## Structured Output

LLM 응답은 자연어 문장과 함께 다음 delimiter 를 사용한다.

````md
<artifact-meta>
{
  "componentName": "PrimaryButton",
  "primaryExport": "PrimaryButton",
  "defaultProps": { "children": "Save" },
  "variants": [
    { "name": "Default", "props": { "children": "Save" } },
    { "name": "Disabled", "props": { "children": "Save", "disabled": true } }
  ]
}
</artifact-meta>

<artifact type="component" filename="PrimaryButton.tsx">
```tsx
...
```
</artifact>

<artifact type="story" filename="PrimaryButton.stories.tsx">
```tsx
...
```
</artifact>

<artifact type="test" filename="PrimaryButton.test.tsx">
```tsx
...
```
</artifact>

<notes type="a11y">
...
</notes>

<notes type="token">
...
</notes>
````

이 포맷은 전체 응답을 JSON 으로 강제하지 않으면서도 preview 와 validation 에
필요한 부분을 안정적으로 추출한다. `artifact-meta`는 모델이 준 힌트가 아니라 validated
render contract 이다. metadata 가 있으면 `primaryExport`는 실제 component export 와
정확히 일치해야 하며, Canvas 와 runtime harness 는 strict lookup 을 사용한다.
metadata primaryExport 가 틀리면 fallback 하지 않고 contract failure 로 표시한다.
metadata 가 없을 때만 UI에 heuristic fallback warning 을 표시한다.

Preview iframe 은 생성 entry 에서 `vapor-preview-ready` 또는 `vapor-preview-error`
message 를 parent UI 로 보낸다. 이 신호가 있어야 Canvas 가 단순 iframe 표시가 아니라
runtime lifecycle 을 가진 preview 로 설명된다. Preview 는 parent 와 다른 loopback host
origin 에서 로드되고, Parent 는 iframe `contentWindow`, isolated preview origin,
`previewRunId`, variant/theme, message type whitelist 를 모두 확인한다. Parent 는
iframe `contentDocument`를 읽지 않으며 endpoint 실패는 parent-side fetch 결과로 표시한다.
iframe 이 ready/error 를 보내지 않으면 timeout 으로 Canvas failed state 를 표시한다.
Runtime Render 와 Axe harness 는 metadata variants 전체를 순회한다.

## 컴포넌트 구성

```txt
ChatScreen                  채팅 화면 최상위 합성
├─ ConversationView         메시지 thread
│  └─ MessageBubble         user/assistant 버블
│     ├─ AttachmentChip     참고 파일 칩
│     ├─ Markdown           어시스턴트 응답 렌더링
│     └─ MessageActions     복사 / 재생성 / 반응
├─ PreviewPanel             artifact workspace
│  └─ Component / Story / Test / Validation tabs
├─ EmptyState               첫 assistant bubble + 작업 템플릿
├─ ThemeToggle              라이트/다크 모드 전환
└─ PromptBar                mode selector + inline attach + textarea
```

## 경계 규칙

경계는 문서 권고가 아니라 `eslint.config.js` 의 `no-restricted-imports` 로 강제된다.

### Vapor 경계

`@vapor-ui/core` 직접 import 는 제품 컴포넌트 레이어와 `src/main.tsx` 에만 허용한다.
앱 레이어와 agent core 는 Vapor primitive 를 직접 알지 않는다.

### Agent 내부 경계

`src/app/**`, `src/components/chat/**` 는 `src/agent` 배럴만 import 한다.
`src/agent/MockAgentClient` 같은 내부 deep import 는 ESLint error 로 막는다.

## Token Usage Check

MVP 검증은 rule-based static check 다.

- raw hex, `rgb(...)`, `rgba(...)` 사용 감지
- hard-coded `px` spacing/radius 감지
- `--vapor-`, `@vapor-ui/core`, `colorPalette` 같은 Vapor token/primitives 사용 확인
- pass/warn/fail 로 정규화해 Validation tab 과 badge 에 반영

완전한 linter 가 아니라, DS 포트폴리오 MVP 에서 빠르게 피드백 가능한 안전장치로
설계했다.

## 스타일링

스타일은 Tailwind CSS v4 와 Vapor UI 의 Tailwind 프리셋을 함께 사용한다.

- Vapor 토큰은 `bg-v-canvas-100`, `gap-v-200` 같은 `v-` 유틸리티로 사용한다.
- 다크 모드는 Vapor `ThemeProvider` + `useTheme` 로 전환한다.
- primary color 는 강조색으로 제한하고, 검증 상태에는 semantic color 를 사용한다.

## Workbench 데이터 흐름 (ultragoal 기준)

```txt
PromptBar(template click → seedMode/seedText | starter → fixture)
        ↓
ChatScreen.handlePickSuggestion
  ├─ starter 템플릿: loadSampleRun(createTemplateSampleRun(key))
  └─ free-form: send(AgentRequest)
        ↓
useAgentStream  (AbortController, mountedRef gate)
        ↓
AgentClient.sendMessage(request)
  ├─ DeepSeekAgentClient → /api/deepseek/chat (SSE)
  └─ Mock / deterministic sample (no network)
        ↓
ChatMessage { role, text, draft, artifactSource, artifactProvenance, request }
        ↓
PreviewPanel  (key={artifactRunId} → 새 run 마다 remount)
  ├─ ArtifactCanvas (component mode 한정)
  ├─ Component/Story/Test 탭
  └─ ValidationPanel (Tests 탭)
```

`artifactRunId = '${assistantMessage.id}:${createdAt}'` 가 한 artifactRun 의
정체성이다. PreviewPanel 은 이 키로 mount 되므로 새 run 이 오면 validation
state, approval state, Canvas state 가 React 레벨에서 자동 초기화된다. 이전 run 의
PASS 가 새 run 으로 carry-over 되지 않는다는 G005 contract 가 이 키 메커니즘과
`validationPipeline.artifactRunId === artifactRunId` 비교 두 곳에서 동시에
보장된다.

## Mode 별 contract

| mode | 산출물 | Canvas iframe | validation gates |
|------|--------|---------------|------------------|
| `component` | component + story + test + a11y/token notes + artifact-meta | 필수 | Typecheck / Unit / Runtime Render / Axe / Vapor token / Cleanup |
| `token-sync` | token map utility + test + mapping notes | **렌더 안 함** | Artifact parse / Token mapping schema / Typecheck / Unit / Vapor token / Cleanup |
| `a11y-audit` | patch + test + a11y notes | 조건부 | Typecheck / Unit / Runtime / Axe / Cleanup |
| `story-test` | story + test + optional component patch | 조건부 | Typecheck / Unit / optional Axe / Cleanup |

Token Sync 가 Canvas tab 자체를 노출하지 않는 G007 분기는 `PreviewPanel` 의
`canvasSection = canvas && !isTokenSync` 한 줄로 표현된다. 서버 validation runner
도 `mode === 'token-sync'` 일 때 Runtime/Axe gate 를 emit 하지 않는다.

## Canvas preview lifecycle

```txt
loading ─ ready signal ─→ ready
   │
   ├─ 8s timeout ─→ timeout (failed 와 구별되는 4번째 상태)
   ├─ iframe import / mount error ─→ failed
   └─ preview-runs endpoint failure ─→ failed
```

`previewRunId` 와 origin check 로 다른 run 의 메시지를 무시하고, ready 신호가
8 초 안에 도착하지 않으면 `timeout` 으로 전환한다. UI 에는 한국어 안내
("Canvas runtime이 응답하지 않습니다…") 가 표시되고 `aria-label="Canvas runtime:
timeout"` 으로 노출된다.

## Repair payload contract

Fix with Agent 버튼은 다음 payload 로 `send()` 를 호출한다:

```ts
{
  text: '실패한 validation 결과를 바탕으로 수정해줘…',
  mode: latestArtifactMode,
  previousArtifactSource: payload.artifactSource,
  validationResult: payload.validationResult,
  repairIntent: { failedGates: [...], maxAttempts: 1 },
}
```

`promptBuilder.buildUserContent` 는 `previousArtifactSource` 와 `repairIntent`
가 있으면 별도 Repair context section 을 prompt 에 주입한다:

- 이전 artifact 원본 (8KB 상한)
- 실패한 gate 목록
- 각 failed gate 의 runner output 요약 (1.5KB 상한)
- "실패한 gate 만 고치고, 통과한 gate 는 깨지 마라. 전체 artifact 를 같은 delimiter
  형식으로 재반환하라" 지시

이 덕분에 agent 가 "이전 실패 내역을 모른다" 고 답하는 G004 회귀가 차단된다.

## ValidationPanel

`/api/deepseek/validate` 가 반환한 `RemoteValidationResult` 를 markdown 대신
구조화 UI 로 렌더한다 (G008):

- 헤더: 전체 status 뱃지, 총 duration, timestamp, `n gates · m pass · k fail` 요약
- gate card 별: status icon · label · duration · message · output disclosure ·
  "출력 복사" · failed gate 의 "이 gate 수정" 액션
- failed gate 는 기본적으로 output disclosure 가 열려 있어 E2E 와 사용자 모두
  추가 클릭 없이 원인을 확인할 수 있다.
- output 은 4KB 상한으로 잘리고 "출력이 잘렸습니다" 안내가 붙는다.

## Live DeepSeek smoke 분리

Live DeepSeek 호출은 응답 변동성으로 flaky 하므로 `verify:ci` / `test:e2e` 같은
CI hard gate 에 포함되지 않는다. `playwright.smoke.config.ts` + `smoke:live-
deepseek` 스크립트로 격리되며, `DEEPSEEK_API_KEY` 가 없으면 `test.skip` 으로
suite 전체가 skip 되고 exit 0 으로 종료된다 (G010).
