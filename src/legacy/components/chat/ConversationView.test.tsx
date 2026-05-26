import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../agent';
import { ConversationView } from './ConversationView';

const makeMessage = (id: string, text: string): ChatMessage => ({
  id,
  role: 'assistant',
  text,
  status: 'done',
  createdAt: Date.UTC(2026, 0, 1, 9, 30),
});

function setScrollMetrics(element: HTMLElement, metrics: {
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
}) {
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: metrics.scrollHeight,
  });
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: metrics.clientHeight,
  });
  Object.defineProperty(element, 'scrollTop', {
    configurable: true,
    writable: true,
    value: metrics.scrollTop,
  });
}

describe('ConversationView', () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  afterEach(() => {
    scrollIntoView.mockReset();
  });

  it('새 메시지를 받을 때 사용자가 하단에 있으면 자동 스크롤한다', () => {
    const { rerender } = render(
      <ConversationView messages={[makeMessage('a', 'first')]} onRegenerate={vi.fn()} />,
    );
    scrollIntoView.mockClear();

    rerender(
      <ConversationView
        messages={[makeMessage('a', 'first'), makeMessage('b', 'second')]}
        onRegenerate={vi.fn()}
      />,
    );

    expect(scrollIntoView).toHaveBeenCalled();
  });

  it('사용자가 위로 스크롤한 상태에서는 streaming 업데이트가 위치를 강제하지 않는다', () => {
    const { rerender } = render(
      <ConversationView messages={[makeMessage('a', 'first')]} onRegenerate={vi.fn()} />,
    );
    const log = screen.getByRole('log', { name: '대화 내용' });
    setScrollMetrics(log, {
      scrollHeight: 1200,
      clientHeight: 400,
      scrollTop: 120,
    });
    fireEvent.scroll(log);
    scrollIntoView.mockClear();

    rerender(
      <ConversationView
        messages={[makeMessage('a', 'first'), makeMessage('b', 'streaming token')]}
        onRegenerate={vi.fn()}
      />,
    );

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '최신으로 이동' })).toBeInTheDocument();
  });

  // A05: prefers-reduced-motion 사용자에게는 smooth 가 즉시 jump 로 다운그레이드.
  it('prefers-reduced-motion: reduce 인 사용자는 smooth scroll 없이 즉시 이동한다', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      const { rerender } = render(
        <ConversationView messages={[makeMessage('a', 'first')]} onRegenerate={vi.fn()} />,
      );
      scrollIntoView.mockClear();

      rerender(
        <ConversationView
          messages={[makeMessage('a', 'first'), makeMessage('b', 'second')]}
          onRegenerate={vi.fn()}
        />,
      );

      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'end' });
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  it('reduced motion 비활성 상태에서는 smooth scroll 유지', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    try {
      const { rerender } = render(
        <ConversationView messages={[makeMessage('a', 'first')]} onRegenerate={vi.fn()} />,
      );
      scrollIntoView.mockClear();
      rerender(
        <ConversationView
          messages={[makeMessage('a', 'first'), makeMessage('b', 'second')]}
          onRegenerate={vi.fn()}
        />,
      );
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' });
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
