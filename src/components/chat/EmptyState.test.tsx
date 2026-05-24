import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('TEMPLATES 는 Component, Token Sync, A11y Audit, Story/Test 4 개 mode 를 모두 노출한다', () => {
    render(<EmptyState onPick={vi.fn()} onRunVerifiedSample={vi.fn()} />);

    // Primary Button (component mode)
    expect(screen.getByText('Primary Button')).toBeInTheDocument();
    // Token Sync
    expect(screen.getByText('Token Sync')).toBeInTheDocument();
    // A11y Fix
    expect(screen.getByText('A11y Fix')).toBeInTheDocument();
    // Story/Test (누락 검증)
    expect(screen.getByText('Story/Test')).toBeInTheDocument();
  });

  it('템플릿 버튼 클릭 시 onPick 이 templateKey 와 함께 호출된다', async () => {
    const onPick = vi.fn();
    render(<EmptyState onPick={onPick} onRunVerifiedSample={vi.fn()} />);

    screen.getByText('Primary Button').click();

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('primary-button');
  });
});
