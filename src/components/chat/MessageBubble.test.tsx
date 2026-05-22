import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage } from '../../agent';

const makeMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'm1',
  role: 'assistant',
  text: '안녕하세요',
  status: 'done',
  createdAt: Date.UTC(2026, 0, 1, 9, 30),
  ...overrides,
});

describe('MessageBubble', () => {
  it('user 메시지를 렌더링한다', () => {
    render(<MessageBubble message={makeMessage({ role: 'user', text: '질문' })} />);
    const bubble = screen.getByText('질문').closest('[data-role]');
    expect(bubble).toHaveAttribute('data-role', 'user');
  });

  it('스트리밍 중이고 본문이 비어 있으면 타이핑 인디케이터를 보여준다', () => {
    render(
      <MessageBubble
        message={makeMessage({ role: 'assistant', text: '', status: 'streaming' })}
      />,
    );
    expect(screen.getByRole('status', { name: '응답 생성 중' })).toBeInTheDocument();
  });

  it('스트리밍 중 본문이 들어오면 텍스트를 렌더링한다', () => {
    render(
      <MessageBubble
        message={makeMessage({ text: '생성 중인 답변', status: 'streaming' })}
      />,
    );
    expect(screen.getByText('생성 중인 답변')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('error 상태에서 에러 메시지를 alert 로 보여준다', () => {
    render(
      <MessageBubble
        message={makeMessage({
          status: 'error',
          errorMessage: '응답 생성에 실패했습니다.',
        })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('응답 생성에 실패했습니다.');
  });

  it('cancelled 상태에서 중단 안내를 보여준다', () => {
    render(<MessageBubble message={makeMessage({ status: 'cancelled' })} />);
    expect(screen.getByText('응답이 중단되었습니다.')).toBeInTheDocument();
  });
});
