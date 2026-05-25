import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';

// validateGeneratedArtifact 는 외부 자식 프로세스 (tsc/vitest) 를 spawn 하므로
// 단위 테스트에서는 mock 한 deferred promise 로 대체한다. 이렇게 하면 동시
// 요청이 활성 상태인 동안 다음 요청이 429 를 받는지 결정적으로 검증할 수 있다.
const mockValidate = vi.fn();
vi.mock('./validateGeneratedArtifact.ts', () => ({
  validateGeneratedArtifact: (markdown: string, mode?: string) => mockValidate(markdown, mode),
}));

import {
  __resetValidationConcurrencyForTest,
  getActiveValidationRuns,
  getMaxValidationRuns,
  handleGeneratedValidation,
} from './validationProxy.ts';

type MockResponse = {
  res: ServerResponse;
  payload: () => { status: number; body: unknown; headers: Record<string, string> };
  done: Promise<void>;
};

function mockRequest(body: object): IncomingMessage {
  const req = new EventEmitter() as IncomingMessage;
  req.method = 'POST';
  req.setEncoding = () => req;
  // 비동기로 body chunk 발행
  queueMicrotask(() => {
    req.emit('data', JSON.stringify(body));
    req.emit('end');
  });
  return req;
}

function mockResponse(): MockResponse {
  const headers: Record<string, string> = {};
  let status = 0;
  let body: unknown = undefined;
  let resolve!: () => void;
  const done = new Promise<void>((r) => {
    resolve = r;
  });
  const res = {
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    writeHead(s: number, h?: Record<string, string>) {
      status = s;
      if (h) Object.assign(headers, h);
    },
    end(chunk: string) {
      try {
        body = JSON.parse(chunk);
      } catch {
        body = chunk;
      }
      resolve();
    },
  } as unknown as ServerResponse;
  return {
    res,
    payload: () => ({ status, body, headers }),
    done,
  };
}

describe('handleGeneratedValidation concurrency guard', () => {
  beforeEach(() => {
    mockValidate.mockReset();
    __resetValidationConcurrencyForTest(2);
  });
  afterEach(() => {
    __resetValidationConcurrencyForTest();
  });

  it('cap 미만 요청은 200 으로 통과한다', async () => {
    mockValidate.mockResolvedValue({ status: 'pass', durationMs: 1, details: [] });
    const r = mockResponse();
    await handleGeneratedValidation(
      mockRequest({ markdown: '<artifact type="component" filename="a.tsx">x</artifact>' }),
      r.res,
    );
    await r.done;
    expect(r.payload().status).toBe(200);
    expect(getActiveValidationRuns()).toBe(0);
  });

  it('cap 초과 시 429 + Retry-After 헤더 + maxConcurrent payload 를 응답한다', async () => {
    // validate 가 외부 deferred promise 에 묶여 활성 상태에서 풀려나지 않음
    let release1!: () => void;
    let release2!: () => void;
    mockValidate
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            release1 = () => res({ status: 'pass', durationMs: 1, details: [] });
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            release2 = () => res({ status: 'pass', durationMs: 1, details: [] });
          }),
      );

    const r1 = mockResponse();
    const r2 = mockResponse();
    const p1 = handleGeneratedValidation(
      mockRequest({ markdown: '<artifact type="component" filename="a.tsx">x</artifact>' }),
      r1.res,
    );
    const p2 = handleGeneratedValidation(
      mockRequest({ markdown: '<artifact type="component" filename="b.tsx">x</artifact>' }),
      r2.res,
    );
    // 두 run 이 활성 상태가 될 때까지 microtask 한 번 양보
    await new Promise((res) => setTimeout(res, 30));
    expect(getActiveValidationRuns()).toBe(getMaxValidationRuns());

    // 3번째 요청 — cap 초과
    const r3 = mockResponse();
    await handleGeneratedValidation(
      mockRequest({ markdown: '<artifact type="component" filename="c.tsx">x</artifact>' }),
      r3.res,
    );
    await r3.done;
    expect(r3.payload().status).toBe(429);
    expect(r3.payload().headers['Retry-After']).toBe('5');
    expect(r3.payload().body).toMatchObject({
      activeRuns: getMaxValidationRuns(),
      maxConcurrent: getMaxValidationRuns(),
    });

    // 첫 run 을 해제하면 cap 이 회복되어 다음 요청이 통과
    release1();
    await p1;
    expect(getActiveValidationRuns()).toBe(1);
    release2();
    await p2;
    expect(getActiveValidationRuns()).toBe(0);
  });

  it('validate 가 throw 해도 activeRuns 가 누수되지 않는다', async () => {
    mockValidate.mockRejectedValueOnce(new Error('boom'));
    const r = mockResponse();
    await handleGeneratedValidation(
      mockRequest({ markdown: '<artifact type="component" filename="a.tsx">x</artifact>' }),
      r.res,
    );
    await r.done;
    expect(r.payload().status).toBe(500);
    expect(getActiveValidationRuns()).toBe(0);
  });

  it('non-POST 메서드는 405 를 반환하고 cap 을 쓰지 않는다', async () => {
    const r = mockResponse();
    const req = mockRequest({});
    req.method = 'GET';
    await handleGeneratedValidation(req, r.res);
    await r.done;
    expect(r.payload().status).toBe(405);
    expect(getActiveValidationRuns()).toBe(0);
  });
});
