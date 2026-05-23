# Validation Matrix

This matrix separates verified MVP behavior from final portfolio gates.

## Current Status

| Area | Status | Evidence |
| --- | --- | --- |
| Product concept | implemented | Vapor DS Automation Agent UI |
| DeepSeek proxy | implemented | same-origin `/api/deepseek/chat` stream smoke |
| Artifact parser | implemented | `src/agent/responseParser.ts` tests |
| Token usage static check | implemented | `src/agent/tokenUsage.ts` tests |
| Artifact workspace | implemented | Component / Story / Test / Validation tabs |
| Inline attachment composer | implemented | `.json/.ts/.tsx/.md/.txt` text extraction |
| Generated typecheck runner | not implemented | `npm run verify:generated` intentionally fails |
| Generated Vitest runner | not implemented | pending `server/validation/*` |
| Generated Axe runner | not implemented | pending `server/validation/*` |
| Lighthouse budget | not implemented | pending config and script |

## AI Agent Behavior

| Requirement | Pass criteria | Current |
| --- | --- | --- |
| delimiter parse | component/story/test/a11y/token extracted | pass |
| malformed output | no app crash | partial |
| mode routing | each mode changes prompt context | pass |
| attachment context | text included in request payload | pass |
| prompt injection defense | attachments treated as untrusted | prompt-level only |
| DeepSeek stream | `[DONE]`, malformed SSE, abort, network error handled | pass |
| validation pending/result | generated completion then result display | modeled |
| mock mode | deterministic E2E response | pass |

## Generated Artifact Validation

| Step | Owner module | Pass criteria | Status |
| --- | --- | --- | --- |
| parse | `src/agent/responseParser.ts` | component/story/test found | pass |
| temp workspace | `server/validation/createTempWorkspace.ts` | isolated temp dir created | pending |
| file write | `server/validation/writeGeneratedFiles.ts` | generated files written | pending |
| typecheck | `server/validation/runGeneratedTypecheck.ts` | TS error 0 | pending |
| unit | `server/validation/runGeneratedVitest.ts` | generated tests pass | pending |
| axe | `server/validation/runGeneratedAxe.ts` | violations 0 | pending |
| token | `server/validation/runTokenUsageCheck.ts` | fail 0, warn below threshold | pending |
| aggregate | `server/validation/validateGeneratedArtifact.ts` | normalized result | pending |
| CLI | `server/validation/run-generated-validation.ts` | exits 0 only when all pass | placeholder fail |

## E2E Expansion

Required scenarios:

| Scenario | Status |
| --- | --- |
| empty state + artifact empty workspace | pass |
| component generation + validation badges | pass with mock validation |
| file attach content | pass |
| unsupported file rejection | pass |
| maxFiles across repeated attachments | unit pass |
| A11y Audit with TSX attachment | pending |
| Token Sync with token JSON | pending |
| abort | pass |
| error recovery | partial |
| keyboard-only flow | pass |
| copy action | pending |

## Interview Positioning

Say:

```txt
The MVP proves the product shell, prompt routing, artifact parsing, and token
check. The next gate is real generated artifact validation in an isolated temp
workspace. Mock validation is used only for deterministic E2E and is documented
as not real validation.
```

Do not say:

```txt
Generated code is fully verified.
```

until `npm run verify:generated` passes with real typecheck, Vitest, Axe, token
check, and cleanup.
