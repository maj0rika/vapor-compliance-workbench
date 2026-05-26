import type { AgentEvent, AgentRequest } from './types';

/**
 * 에이전트 클라이언트 인터페이스.
 *
 * 스트리밍 응답을 `AsyncIterable<AgentEvent>` 로 노출한다. 모의 구현
 * (MockAgentClient)을 실제 백엔드 클라이언트로 교체할 수 있도록 인터페이스로
 * 분리한다.
 *
 * ## Teardown 계약
 *
 * `sendMessage` 는 선택적 `AbortSignal` 을 받는다. **취소·정리 책임은
 * 소비자에게 있다.** 소비자(예: `useAgentStream` 훅)는:
 * - send 마다 `AbortController` 를 하나 생성·소유한다.
 * - 컴포넌트 언마운트 또는 새 send 시 `abort()` 를 호출한다.
 * - abort 이후에는 어떤 상태도 갱신하지 않는다.
 *
 * abort 시 구현체는 진행 중인 스트림을 즉시 중단하고 이터레이터를
 * 종료해야 한다 (`done`/`error` 이벤트 없이).
 */
export interface AgentClient {
  sendMessage(
    request: AgentRequest,
    signal?: AbortSignal,
  ): AsyncIterable<AgentEvent>;
}
