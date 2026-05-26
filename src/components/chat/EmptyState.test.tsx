import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('TEMPLATES 는 Component, Token Sync, A11y Audit, Story/Test 모드를 모두 노출한다', () => {
    render(<EmptyState onPick={vi.fn()} onRunVerifiedSample={vi.fn()} />);

    // 템플릿 버튼만 찾도록 role 로 scope — 사용 설명서 본문의 같은 문구와 충돌 방지
    expect(screen.getByRole('button', { name: /Primary Button/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Data Table/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Token Sync/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /A11y Fix/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Story\/Test/ })).toBeInTheDocument();
  });

  it('템플릿 버튼 클릭 시 onPick 이 templateKey 와 함께 호출된다', async () => {
    const onPick = vi.fn();
    render(<EmptyState onPick={onPick} onRunVerifiedSample={vi.fn()} />);

    screen.getByRole('button', { name: /Primary Button/ }).click();

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('primary-button');
  });
});
