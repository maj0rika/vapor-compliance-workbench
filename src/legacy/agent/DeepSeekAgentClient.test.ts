import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeepSeekAgentClient, parseDeepSeekSseFrame } from './DeepSeekAgentClient';
import type { AgentEvent } from './types';

async function collect(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of iterable) {
    // 'debug' 는 UI 디버그 탭 전용 metadata. 라이프사이클 계약 테스트에서는
    // 무시한다 — done/error 순서/카운트 단언이 깨지지 않도록.
    if (event.type === 'debug') continue;
    events.push(event);
  }
  return events;
}

function streamFrom(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

describe('DeepSeekAgentClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('SSE token chunk 를 token 이벤트로 변환한다', () => {
    const events = parseDeepSeekSseFrame(
      'data: {"choices":[{"delta":{"content":"안녕"}}]}\n\n',
    );

    expect(events).toEqual([{ type: 'token', value: '안녕' }]);
  });

  it('[DONE] chunk 를 done 이벤트로 변환한다', () => {
    expect(parseDeepSeekSseFrame('data: [DONE]\n\n')).toEqual([{ type: 'done' }]);
  });

  it('malformed JSON chunk 는 error 이벤트로 변환한다', () => {
    expect(parseDeepSeekSseFrame('data: {broken}\n\n')).toEqual([
      { type: 'error', message: 'DeepSeek stream parse failed.' },
    ]);
  });

  it('프록시 error response 를 error 이벤트로 변환한다', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'DEEPSEEK_API_KEY is missing.' }), {
          status: 500,
        }),
      );
    const client = new DeepSeekAgentClient('/test');

    const events = await collect(client.sendMessage({ text: '안녕' }));

    expect(fetchMock).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(events).toEqual([
      { type: 'error', message: 'DEEPSEEK_API_KEY is missing.' },
    ]);
  });

  it('stream response 를 기존 AgentEvent 계약으로 방출한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        streamFrom([
          'data: {"choices":[{"delta":{"content":"안"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"녕"}}]}\n\n',
          'data: [DONE]\n\n',
        ]),
        { status: 200 },
      ),
    );
    const client = new DeepSeekAgentClient('/test');

    const events = await collect(client.sendMessage({ text: '안녕' }));

    expect(events).toEqual([
      { type: 'token', value: '안' },
      { type: 'token', value: '녕' },
      { type: 'done' },
    ]);
  });

  it('artifact stream 완료 후 실제 validation 결과로 draft 를 교체한다', async () => {
    const artifact = `<artifact type="component" filename="PrimaryButton.tsx">
\`\`\`tsx
export function PrimaryButton() {
  return <button>Save</button>;
}
\`\`\`
</artifact>

<artifact type="story" filename="PrimaryButton.stories.tsx">
\`\`\`tsx
export const Default = {};
\`\`\`
</artifact>

<artifact type="test" filename="PrimaryButton.test.tsx">
\`\`\`tsx
expect(true).toBe(true);
\`\`\`
</artifact>

<notes type="a11y">
Uses a native button.
</notes>`;
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          streamFrom([
            `data: ${JSON.stringify({ choices: [{ delta: { content: artifact } }] })}\n\n`,
            'data: [DONE]\n\n',
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'pass',
            durationMs: 123,
            details: [
              { label: 'Typecheck', status: 'pass', message: 'ok' },
              { label: 'Unit', status: 'pass', message: 'ok' },
              { label: 'Axe', status: 'pass', message: 'ok' },
              { label: 'Vapor token usage', status: 'pass', message: 'ok' },
            ],
          }),
          { status: 200 },
        ),
      );
    const client = new DeepSeekAgentClient('/chat', '/validate');

    const events = await collect(client.sendMessage({ text: '버튼 생성' }));
    const drafts = events.filter((event) => event.type === 'draft');

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/validate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ markdown: artifact }),
      }),
    );
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({ type: 'draft' });
    expect(drafts[0]).not.toHaveProperty('replace');
    expect(drafts[1]).toMatchObject({ type: 'draft', replace: true });
    expect(drafts[1]?.value).toContain('- Typecheck: PASS');
    expect(events.at(-1)).toEqual({ type: 'done' });
  });

  it('artifact 와 notes 원문은 conversation token 으로 노출하지 않는다', async () => {
    const artifact = `<artifact type="component" filename="PrimaryButton.tsx">
\`\`\`tsx
export function PrimaryButton() {
  return <button>Save</button>;
}
\`\`\`
</artifact>

<artifact type="story" filename="PrimaryButton.stories.tsx">
\`\`\`tsx
export const Default = {};
\`\`\`
</artifact>

<artifact type="test" filename="PrimaryButton.test.tsx">
\`\`\`tsx
expect(true).toBe(true);
\`\`\`
</artifact>

<notes type="token">
raw artifact notes
</notes>`;
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          streamFrom([
            `data: ${JSON.stringify({ choices: [{ delta: { content: `요약입니다.\n\n${artifact}` } }] })}\n\n`,
            'data: [DONE]\n\n',
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: 'pass',
            durationMs: 1,
            details: [],
          }),
          { status: 200 },
        ),
      );
    const client = new DeepSeekAgentClient('/chat', '/validate');

    const events = await collect(client.sendMessage({ text: '버튼 생성' }));
    const conversationText = events
      .filter((event) => event.type === 'token')
      .map((event) => event.value)
      .join('');

    expect(conversationText).toBe('요약입니다.\n\n');
    expect(conversationText).not.toContain('<artifact');
    expect(conversationText).not.toContain('export function');
    expect(conversationText).not.toContain('<notes');
    expect(events.some((event) => event.type === 'draft')).toBe(true);
  });

  it('tag 없이 흘러온 fenced code 는 conversation token 으로 노출하지 않는다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        streamFrom([
          `data: ${JSON.stringify({
            choices: [
              {
                delta: {
                  content: `요약입니다.

\`\`\`tsx
export function LeakedCode() {
  return <button />;
}
\`\`\`

후속 설명`,
                },
              },
            ],
          })}\n\n`,
          'data: [DONE]\n\n',
        ]),
        { status: 200 },
      ),
    );
    const client = new DeepSeekAgentClient('/chat', '/validate');

    const events = await collect(client.sendMessage({ text: '버튼 생성' }));
    const conversationText = events
      .filter((event) => event.type === 'token')
      .map((event) => event.value)
      .join('');

    expect(conversationText).toBe('요약입니다.\n\n후속 설명');
    expect(conversationText).not.toContain('```');
    expect(conversationText).not.toContain('export function');
  });

  it('미완성 <artifact 태그 partial 응답이 conversation token 에 노출되지 않는다', async () => {
    // fenced code block 이 닫히지 않은 partial stream 시뮬레이션
    const partialContent = '요약입니다.\n\n<artifact type="component" filename="Foo.tsx">\n```tsx\nexport function Foo() {';
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        streamFrom([
          `data: ${JSON.stringify({ choices: [{ delta: { content: partialContent } }] })}\n\n`,
          'data: [DONE]\n\n',
        ]),
        { status: 200 },
      ),
    );
    const client = new DeepSeekAgentClient('/chat', '/validate');

    const events = await collect(client.sendMessage({ text: '버튼 생성' }));
    const conversationText = events
      .filter((event) => event.type === 'token')
      .map((event) => event.value)
      .join('');

    expect(conversationText).not.toContain('<artifact');
    expect(conversationText).not.toContain('```tsx');
    expect(conversationText).not.toContain('export function Foo');
  });

  it('artifact-only 응답에 대해 한국어 fallback prose token 을 한 번 emit 한다', async () => {
    // DeepSeek 가 prose 없이 artifact 만 emit 하는 경우 (실제 live smoke 에서 관찰됨).
    // visibleConversationText 가 비어 있더라도 assistant bubble 이 빈 채로 남지
    // 않도록 한국어 안내 token 이 1회 emit 되어야 한다.
    const artifactOnlyContent = [
      '<artifact-meta>',
      '{"componentName":"PrimaryActionButton","primaryExport":"PrimaryActionButton","variants":[{"name":"Default"}]}',
      '</artifact-meta>',
      '<artifact type="component" filename="PrimaryActionButton.tsx">',
      '```tsx',
      'export function PrimaryActionButton() { return null; }',
      '```',
      '</artifact>',
    ].join('\n');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/validate')) {
        return new Response(JSON.stringify({ status: 'pass', durationMs: 0, details: [] }), {
          status: 200,
        });
      }
      return new Response(
        streamFrom([
          `data: ${JSON.stringify({ choices: [{ delta: { content: artifactOnlyContent } }] })}\n\n`,
          'data: [DONE]\n\n',
        ]),
        { status: 200 },
      );
    });
    const client = new DeepSeekAgentClient('/chat', '/validate');

    const events = await collect(client.sendMessage({ text: 'primary 버튼 생성' }));
    const tokens = events
      .filter((event): event is Extract<AgentEvent, { type: 'token' }> => event.type === 'token')
      .map((event) => event.value);

    // 한국어 fallback prose 가 1회 노출됨
    const fallbackMatches = tokens.filter((value) =>
      value.includes('생성된 산출물을 오른쪽 워크스페이스에 정리했습니다'),
    );
    expect(fallbackMatches).toHaveLength(1);

    // raw artifact tag 는 절대 conversation token 에 노출되지 않음
    const conversationText = tokens.join('');
    expect(conversationText).not.toContain('<artifact');
    expect(conversationText).not.toContain('```tsx');

    // draft event 도 정상 emit (artifact workspace 보장)
    const draftEvents = events.filter((event) => event.type === 'draft');
    expect(draftEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('abort 시 done/error 없이 종료한다', async () => {
    const controller = new AbortController();
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      controller.abort();
      return new Response(streamFrom(['data: [DONE]\n\n']), { status: 200 });
    });
    const client = new DeepSeekAgentClient('/test');

    const events = await collect(
      client.sendMessage({ text: '멈춰' }, controller.signal),
    );

    expect(events).toEqual([]);
  });
});
