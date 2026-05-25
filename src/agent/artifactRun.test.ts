import { describe, expect, it } from 'vitest';
import {
  ArtifactRunApprovalError,
  assertRepairIntentHasParentRunId,
  createArtifactRunFromMessage,
  isApprovable,
  markSuperseded,
  withApproval,
  withValidation,
  type ArtifactRun,
  type RemoteValidationResult,
} from './artifactRun';
import type { ChatMessage } from './types';

const ARTIFACT_SOURCE = [
  '<artifact-meta>',
  '{"componentName":"PrimaryActionButton","primaryExport":"PrimaryActionButton","variants":[{"name":"Default"}]}',
  '</artifact-meta>',
  '<artifact type="component" filename="PrimaryActionButton.tsx">',
  '```tsx',
  'export function PrimaryActionButton() { return null; }',
  '```',
  '</artifact>',
].join('\n');

function assistantMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    role: 'assistant',
    text: '',
    status: 'done',
    createdAt: 1_000,
    draft: 'rendered draft',
    artifactSource: ARTIFACT_SOURCE,
    request: { text: 'primary 버튼', mode: 'component' },
    ...overrides,
  };
}

const PASS: RemoteValidationResult = {
  status: 'pass',
  durationMs: 10,
  details: [{ label: 'Typecheck', status: 'pass', message: 'ok' }],
};
const FAIL: RemoteValidationResult = {
  status: 'fail',
  durationMs: 10,
  details: [{ label: 'Typecheck', status: 'fail', message: 'broken' }],
};

describe('createArtifactRunFromMessage adapter (G011)', () => {
  it('assistant 메시지에서 ArtifactRun 을 만든다 (id = message.id:createdAt)', () => {
    const run = createArtifactRunFromMessage(assistantMessage());
    expect(run).toBeDefined();
    expect(run!.id).toBe('msg-1:1000');
    expect(run!.mode).toBe('component');
    expect(run!.status).toBe('created');
    expect(run!.artifactSource).toBe(ARTIFACT_SOURCE);
    expect(run!.repairHistory).toEqual([]);
  });

  it('artifactProvenance=deterministic-sample 이면 source=sample 로 매핑', () => {
    const run = createArtifactRunFromMessage(
      assistantMessage({ artifactProvenance: 'deterministic-sample' }),
    );
    expect(run!.source).toBe('sample');
  });

  it('기본 source 는 deepseek', () => {
    const run = createArtifactRunFromMessage(assistantMessage());
    expect(run!.source).toBe('deepseek');
  });

  it('user 메시지나 artifactSource 없으면 undefined 반환', () => {
    expect(
      createArtifactRunFromMessage({
        id: 'u',
        role: 'user',
        text: 'hi',
        status: 'done',
        createdAt: 0,
      }),
    ).toBeUndefined();
    expect(
      createArtifactRunFromMessage(assistantMessage({ artifactSource: undefined })),
    ).toBeUndefined();
  });
});

describe('ArtifactRun lifecycle helpers (G011)', () => {
  function makeRun(): ArtifactRun {
    return createArtifactRunFromMessage(assistantMessage())!;
  }

  it('withValidation pass → status=passed', () => {
    const next = withValidation(makeRun(), PASS);
    expect(next.status).toBe('passed');
    expect(next.validation).toEqual(PASS);
    expect(isApprovable(next)).toBe(true);
  });

  it('withValidation fail → status=failed, isApprovable=false', () => {
    const next = withValidation(makeRun(), FAIL);
    expect(next.status).toBe('failed');
    expect(isApprovable(next)).toBe(false);
  });

  it('withApproval → status=approved, approvedAt 저장', () => {
    const passed = withValidation(makeRun(), PASS);
    const approved = withApproval(passed, 9_999);
    expect(approved.status).toBe('approved');
    expect(approved.approval).toEqual({ type: 'local-review', approvedAt: 9_999 });
  });

  it('markSuperseded 는 immutable: 원본 status 유지, 새 객체만 superseded', () => {
    const run = makeRun();
    const superseded = markSuperseded(run);
    expect(run.status).toBe('created');
    expect(superseded.status).toBe('superseded');
  });

  it('새 run 은 이전 run 의 validation/approval 을 상속하지 않는다 (carry-over 차단)', () => {
    const oldRun = withApproval(withValidation(makeRun(), PASS), 1);
    const newRun = createArtifactRunFromMessage(
      assistantMessage({ id: 'msg-2', createdAt: 2_000 }),
    )!;
    expect(newRun.id).not.toBe(oldRun.id);
    expect(newRun.validation).toBeUndefined();
    expect(newRun.approval).toBeUndefined();
    expect(newRun.status).toBe('created');
    expect(isApprovable(newRun)).toBe(false);
  });
});

describe('ArtifactRun approval invariant (G011.1)', () => {
  function makeRun(): ArtifactRun {
    return createArtifactRunFromMessage(assistantMessage())!;
  }

  it('created run 은 승인할 수 없다 (validation 미실행)', () => {
    expect(() => withApproval(makeRun(), Date.now())).toThrow(ArtifactRunApprovalError);
  });

  it('failed run 은 승인할 수 없다', () => {
    const failed = withValidation(makeRun(), FAIL);
    expect(() => withApproval(failed, Date.now())).toThrow(ArtifactRunApprovalError);
  });

  it('passed run 만 승인 가능', () => {
    const passed = withValidation(makeRun(), PASS);
    const approved = withApproval(passed, 1_111);
    expect(approved.status).toBe('approved');
    expect(approved.approval?.approvedAt).toBe(1_111);
  });
});

describe('ArtifactRun source classification (G011.1)', () => {
  it('options.source 가 지정되면 그 값을 그대로 사용한다 (mock)', () => {
    const run = createArtifactRunFromMessage(assistantMessage(), { source: 'mock' });
    expect(run!.source).toBe('mock');
  });

  it('deterministic-sample 메시지는 options.source 와 무관하게 sample 로 매핑된다', () => {
    const run = createArtifactRunFromMessage(
      assistantMessage({ artifactProvenance: 'deterministic-sample' }),
      { source: 'mock' },
    );
    expect(run!.source).toBe('sample');
  });

  it('options.source 미지정 시 기본은 deepseek', () => {
    const run = createArtifactRunFromMessage(assistantMessage());
    expect(run!.source).toBe('deepseek');
  });
});

describe('assertRepairIntentHasParentRunId (G011.1)', () => {
  it('repairIntent 가 없으면 no-op', () => {
    expect(() => assertRepairIntentHasParentRunId({})).not.toThrow();
  });

  it('failedGates 가 비어 있으면 no-op', () => {
    expect(() =>
      assertRepairIntentHasParentRunId({
        repairIntent: { failedGates: [], parentRunId: undefined },
      }),
    ).not.toThrow();
  });

  it('failedGates 가 있는데 parentRunId 가 누락되면 throw', () => {
    expect(() =>
      assertRepairIntentHasParentRunId({
        repairIntent: { failedGates: ['typecheck'], parentRunId: undefined },
      }),
    ).toThrow(/parentRunId/);
  });

  it('failedGates 가 있고 parentRunId 가 빈 문자열이면 throw', () => {
    expect(() =>
      assertRepairIntentHasParentRunId({
        repairIntent: { failedGates: ['typecheck'], parentRunId: '' },
      }),
    ).toThrow(/parentRunId/);
  });

  it('failedGates + parentRunId 가 모두 있으면 통과', () => {
    expect(() =>
      assertRepairIntentHasParentRunId({
        repairIntent: { failedGates: ['typecheck'], parentRunId: 'run-1:1000' },
      }),
    ).not.toThrow();
  });
});
