import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentClient, AgentRequest, ChatMessage } from '../../agent';

export type UseAgentStreamResult = {
  messages: ChatMessage[];
  isStreaming: boolean;
  send: (request: AgentRequest) => void;
  cancel: () => void;
};

/**
 * AgentClient 스트림을 소비하는 훅.
 *
 * ## Teardown 계약 (AgentClient 참조)
 * - send 마다 `AbortController` 를 하나 생성·소유한다.
 * - 새 send 또는 컴포넌트 언마운트 시 직전 컨트롤러를 abort 한다.
 * - 언마운트 이후에는 어떤 상태도 갱신하지 않는다 (`mountedRef` 가드).
 *
 * 이로써 언마운트 중 스트리밍이 진행 중이어도 타이머·제너레이터가 정리되고,
 * 언마운트된 컴포넌트에 setState 가 호출되지 않는다.
 */
export function useAgentStream(client: AgentClient): UseAgentStreamResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const patchMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === id ? { ...message, ...patch } : message,
        ),
      );
    },
    [],
  );

  const runStream = useCallback(
    async (request: AgentRequest, assistantId: string, signal: AbortSignal) => {
      let text = '';
      let draft = '';
      try {
        for await (const event of client.sendMessage(request, signal)) {
          if (!mountedRef.current) return;
          switch (event.type) {
            case 'token':
              text += event.value;
              patchMessage(assistantId, { text });
              break;
            case 'draft':
              draft += event.value;
              patchMessage(assistantId, { draft });
              break;
            case 'done':
              patchMessage(assistantId, { status: 'done' });
              break;
            case 'error':
              patchMessage(assistantId, {
                status: 'error',
                errorMessage: event.message,
              });
              break;
          }
        }
      } finally {
        if (mountedRef.current) {
          setIsStreaming(false);
          // done/error 없이 루프가 끝났고 abort 되었다면 cancelled 로 마감.
          if (signal.aborted) {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId && message.status === 'streaming'
                  ? { ...message, status: 'cancelled' }
                  : message,
              ),
            );
          }
        }
      }
    },
    [client, patchMessage],
  );

  const send = useCallback(
    (request: AgentRequest) => {
      // 직전 스트림이 남아 있으면 정리한다.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: request.text,
        status: 'done',
      };
      const assistantId = crypto.randomUUID();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        text: '',
        status: 'streaming',
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      void runStream(request, assistantId, controller.signal);
    },
    [runStream],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, isStreaming, send, cancel };
}
