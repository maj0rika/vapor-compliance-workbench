import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('TEMPLATES 는 주요 작업 템플릿을 한국어로 노출한다', () => {
    render(<EmptyState onPick={vi.fn()} onRunVerifiedSample={vi.fn()} />);

    expect(screen.getByRole('button', { name: /기본 버튼/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /데이터 테이블/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /토큰 동기화/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /접근성 수정/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /스토리\/테스트/ })).toBeInTheDocument();
  });

  it('템플릿 버튼 클릭 시 onPick 이 templateKey 와 함께 호출된다', async () => {
    const onPick = vi.fn();
    render(<EmptyState onPick={onPick} onRunVerifiedSample={vi.fn()} />);

    screen.getByRole('button', { name: /기본 버튼/ }).click();

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('primary-button');
  });
});
