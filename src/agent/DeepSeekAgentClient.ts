import type { AgentClient } from './AgentClient';
import type { AgentEvent, AgentRequest } from './types';
import { artifactToMarkdown, parseGeneratedArtifact } from './responseParser';
import { checkTokenUsage } from './tokenUsage';

type DeepSeekDelta = {
  choices?: Array<{
    delta?: {
      content?: string;
    };
    finish_reason?: string | null;
  }>;
};

export function parseDeepSeekSseFrame(frame: string): AgentEvent[] {
  const events: AgentEvent[] = [];
  const dataLines = frame
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice('data:'.length).trim());

  for (const data of dataLines) {
    if (!data) continue;
    if (data === '[DONE]') {
      events.push({ type: 'done' });
      continue;
    }

    try {
      const payload = JSON.parse(data) as DeepSeekDelta;
      const choice = payload.choices?.[0];
      const content = choice?.delta?.content;
      if (content) events.push({ type: 'token', value: content });
      if (choice?.finish_reason) events.push({ type: 'done' });
    } catch {
      events.push({ type: 'error', message: 'DeepSeek stream parse failed.' });
    }
  }

  return events;
}

async function* parseDeepSeekStream(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncIterable<AgentEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) return;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        for (const event of parseDeepSeekSseFrame(frame)) {
          if (signal?.aborted) return;
          yield event;
        }
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      for (const event of parseDeepSeekSseFrame(buffer)) {
        if (signal?.aborted) return;
        yield event;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 브라우저용 DeepSeek 클라이언트.
 *
 * API 키는 Vite 서버 프록시가 보관한다. 이 클라이언트는 same-origin
 * endpoint 로 AgentRequest 만 보내고, DeepSeek SSE chunk 를 AgentEvent 로
 * 변환한다.
 */
export class DeepSeekAgentClient implements AgentClient {
  private readonly endpoint: string;

  constructor(endpoint = '/api/deepseek/chat') {
    this.endpoint = endpoint;
  }

  async *sendMessage(
    request: AgentRequest,
    signal?: AbortSignal,
  ): AsyncIterable<AgentEvent> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        yield { type: 'error', message };
        return;
      }

      if (!response.body) {
        yield { type: 'error', message: 'DeepSeek stream is empty.' };
        return;
      }

      let responseText = '';
      let emittedDone = false;
      for await (const event of parseDeepSeekStream(response.body, signal)) {
        if (event.type === 'token') {
          responseText += event.value;
          yield event;
        } else if (event.type === 'done') {
          emittedDone = true;
          const preview = buildPreviewArtifact(responseText);
          if (preview) yield { type: 'draft', value: preview };
          yield event;
        } else {
          yield event;
        }
      }

      if (!signal?.aborted && !emittedDone) {
        const preview = buildPreviewArtifact(responseText);
        if (preview) yield { type: 'draft', value: preview };
        yield { type: 'done' };
      }
    } catch (err) {
      if (signal?.aborted || isAbortError(err)) return;
      yield {
        type: 'error',
        message: err instanceof Error ? err.message : 'DeepSeek request failed.',
      };
    }
  }
}

function buildPreviewArtifact(responseText: string): string {
  const artifact = parseGeneratedArtifact(responseText);
  if (!artifact.component && !artifact.story && !artifact.test) return '';
  const tokenCheck = checkTokenUsage(artifact);
  return artifactToMarkdown(artifact).replace(
    '- Vapor token usage: CHECK',
    `- Vapor token usage: ${tokenCheck.status === 'pass' ? 'PASS' : 'CHECK'}`,
  );
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `DeepSeek request failed (${response.status}).`;
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}
