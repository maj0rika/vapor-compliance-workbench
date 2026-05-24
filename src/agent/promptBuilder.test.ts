import { describe, expect, it } from 'vitest';
import { buildDeepSeekPayload, buildUserContent } from './promptBuilder';

describe('promptBuilder', () => {
  it('DS automation system prompt 와 artifact delimiter 지시를 포함한다', () => {
    const payload = buildDeepSeekPayload({
      text: 'primary 버튼 생성',
      mode: 'component',
    });

    expect(payload.messages[0].content).toContain(
      'AI Design System Automation Agent',
    );
    expect(payload.messages[0].content).toContain(
      '<artifact type="component"',
    );
    expect(payload.messages[0].content).toContain('<artifact-meta>');
    expect(payload.messages[0].content).toContain('primaryExport');
    expect(payload.messages[0].content).toContain('untrusted reference material');
  });

  it('mode 와 attachment text 를 user content 에 포함한다', () => {
    const content = buildUserContent({
      text: '토큰 매핑해줘',
      mode: 'token-sync',
      attachments: [
        {
          fileName: 'tokens.json',
          size: 120,
          kind: 'tokens',
          contentText: '{"color.primary.500":"#0066ff"}',
          truncated: false,
        },
      ],
    });

    expect(content).toContain('Mode: token-sync');
    expect(content).toContain('<artifact-meta>');
    expect(content).toContain('[tokens.json]');
    expect(content).toContain('full text included');
    expect(content).toContain('color.primary.500');
  });

  // Phase A — repair context 반영 테스트 (RED)
  it('repair 요청 시 previousArtifactSource 를 user content 에 포함한다', () => {
    const content = buildUserContent({
      text: '수정해줘',
      mode: 'component',
      previousArtifactSource: '<artifact type="component" filename="Foo.tsx">```tsx\nexport function Foo(){}\n```</artifact>',
      repairIntent: { failedGates: ['token'], maxAttempts: 1 },
    });

    expect(content).toContain('Repair context');
    expect(content).toContain('previousArtifactSource');
    expect(content).toContain('export function Foo');
  });

  it('repair 요청 시 validationResult.failedGates 를 user content 에 포함한다', () => {
    const content = buildUserContent({
      text: '수정해줘',
      mode: 'component',
      previousArtifactSource: '<artifact type="component" filename="Foo.tsx">```tsx\nexport function Foo(){}\n```</artifact>',
      validationResult: {
        status: 'fail',
        durationMs: 100,
        details: [
          { label: 'Vapor token usage', status: 'fail', message: 'raw color detected' },
          { label: 'Typecheck', status: 'pass', message: 'ok' },
        ],
      },
      repairIntent: { failedGates: ['token'], maxAttempts: 1 },
    });

    expect(content).toContain('token');
    expect(content).toContain('Vapor token usage');
  });

  it('repair 요청 시 각 failed gate 의 runner output 요약을 user content 에 포함한다', () => {
    const content = buildUserContent({
      text: '수정해줘',
      mode: 'component',
      previousArtifactSource: '<artifact type="component" filename="Foo.tsx">```tsx\nexport function Foo(){}\n```</artifact>',
      validationResult: {
        status: 'fail',
        durationMs: 100,
        details: [
          { label: 'Vapor token usage', status: 'fail', message: 'raw color detected', output: 'Found: color: #ff0000' },
        ],
      },
      repairIntent: { failedGates: ['token'], maxAttempts: 1 },
    });

    expect(content).toContain('Found: color: #ff0000');
  });

  it('repair 요청 시 실패 gate 만 수정하라는 지시가 prompt 에 포함된다', () => {
    const content = buildUserContent({
      text: '수정해줘',
      mode: 'component',
      previousArtifactSource: '<artifact type="component" filename="Foo.tsx">```tsx\nexport function Foo(){}\n```</artifact>',
      repairIntent: { failedGates: ['token', 'axe'], maxAttempts: 1 },
    });

    expect(content).toContain('실패한 gate만');
    expect(content).toContain('전체 artifact');
  });
});
