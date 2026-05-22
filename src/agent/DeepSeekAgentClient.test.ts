import { describe, expect, it, vi } from 'vitest';
import { DeepSeekAgentClient, parseDeepSeekSseFrame } from './DeepSeekAgentClient';
import type { AgentEvent } from './types';

async function collect(iterable: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const events: AgentEvent[] = [];
  for await (const event of iterable) events.push(event);
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
