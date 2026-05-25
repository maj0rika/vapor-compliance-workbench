import type { IncomingMessage, ServerResponse } from 'node:http';
import { validateGeneratedArtifact } from './validateGeneratedArtifact.ts';

type ValidationProxyRequest = {
  markdown?: unknown;
  mode?: unknown;
};

/**
 * 동시에 spawn 할 수 있는 validation run 수. 각 run 이 tsc/vitest 자식
 * 프로세스 다수와 temp workspace 디렉토리를 만들어 디스크/CPU 를 점유하므로,
 * 더블 클릭 / 다중 탭 / retry 폭주 시에도 단일 호스트가 self-DoS 되지
 * 않도록 cap 한다. 환경변수로 override 가능 (`VAPOR_VALIDATION_MAX_CONCURRENT`).
 */
const DEFAULT_MAX_CONCURRENT_RUNS = 3;
let maxConcurrentRuns = readMaxConcurrent();
let activeRuns = 0;

export function getActiveValidationRuns(): number {
  return activeRuns;
}

export function getMaxValidationRuns(): number {
  return maxConcurrentRuns;
}

export async function handleGeneratedValidation(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  if (activeRuns >= maxConcurrentRuns) {
    res.setHeader('Retry-After', '5');
    sendJson(res, 429, {
      error: `Validation server is busy (${activeRuns}/${maxConcurrentRuns} concurrent runs). Retry in a few seconds.`,
      activeRuns,
      maxConcurrent: maxConcurrentRuns,
    });
    return;
  }

  const parsed = await readRequestBody(req);
  if (!parsed.ok) {
    sendJson(res, 400, { error: parsed.error });
    return;
  }

  const markdown = normalizeMarkdown(parsed.value);
  if (!markdown.ok) {
    sendJson(res, 400, { error: markdown.error });
    return;
  }

  const mode = extractMode(parsed.value);

  activeRuns++;
  try {
    const result = await validateGeneratedArtifact(markdown.value, mode);
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Generated validation failed.',
    });
  } finally {
    activeRuns--;
  }
}

function readMaxConcurrent(): number {
  const raw = process.env.VAPOR_VALIDATION_MAX_CONCURRENT;
  if (!raw) return DEFAULT_MAX_CONCURRENT_RUNS;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed) && parsed > 0 && parsed < 100) return parsed;
  return DEFAULT_MAX_CONCURRENT_RUNS;
}

/**
 * 테스트/리셋용. production code 에서 호출 금지.
 */
export function __resetValidationConcurrencyForTest(max?: number): void {
  activeRuns = 0;
  maxConcurrentRuns = max ?? readMaxConcurrent();
}

function readRequestBody(
  req: IncomingMessage,
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
      if (body.length > 220_000) {
        req.destroy();
        resolve({ ok: false, error: 'Validation request body is too large.' });
      }
    });
    req.on('end', () => {
      try {
        resolve({ ok: true, value: JSON.parse(body) });
      } catch {
        resolve({ ok: false, error: 'Invalid JSON request body.' });
      }
    });
    req.on('error', () => resolve({ ok: false, error: 'Request read failed.' }));
  });
}

function normalizeMarkdown(
  value: unknown,
): { ok: true; value: string } | { ok: false; error: string } {
  const request = value as ValidationProxyRequest;
  if (typeof request.markdown !== 'string' || !request.markdown.trim()) {
    return { ok: false, error: 'Artifact markdown is required.' };
  }
  return { ok: true, value: request.markdown };
}

function extractMode(value: unknown): string | undefined {
  const request = value as ValidationProxyRequest;
  if (typeof request.mode === 'string') return request.mode;
  return undefined;
}

function sendJson(res: ServerResponse, status: number, payload: object) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}
