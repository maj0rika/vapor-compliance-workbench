import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TokenSyncPanel } from './TokenSyncPanel';

const SAMPLE_JSON = {
  variables: [
    { name: 'brand/primary/base', type: 'COLOR', value: '#3B82F6' },
    { name: 'spacing/md', type: 'FLOAT', value: 16, collection: 'Spacing' },
    { name: 'corner/md', type: 'FLOAT', value: 8, collection: 'Radius' },
    { name: 'typography/h1', type: 'STRING', value: 'Pretendard 32' },
  ],
};

describe('TokenSyncPanel (G013.1)', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
  });

  it('주입된 Figma JSON 으로 mapping table 을 렌더', () => {
    render(<TokenSyncPanel figmaJson={SAMPLE_JSON} />);
    expect(screen.getByTestId('token-sync-panel')).toBeInTheDocument();
    expect(screen.getByTestId('token-sync-mapping-table')).toBeInTheDocument();
    expect(screen.getByTestId('token-sync-row-brand/primary/base')).toBeInTheDocument();
    expect(screen.getByTestId('token-sync-row-spacing/md')).toBeInTheDocument();
    expect(screen.getByTestId('token-sync-row-corner/md')).toBeInTheDocument();
  });

  it('summary 가 전체/매핑/미확인 개수를 표시', () => {
    render(<TokenSyncPanel figmaJson={SAMPLE_JSON} />);
    // 4개 변수, 3개 매핑(color/spacing/radius), 1개 미확인(STRING)
    expect(screen.getByTestId('token-sync-summary')).toHaveTextContent(
      '4개 변수 · 3개 매핑 · 미확인 1개',
    );
  });

  it('미확인 변수 섹션 노출', () => {
    render(<TokenSyncPanel figmaJson={SAMPLE_JSON} />);
    const unknowns = screen.getByTestId('token-sync-unknowns');
    expect(unknowns).toBeInTheDocument();
    expect(unknowns).toHaveTextContent('typography/h1');
  });

  it('소스 보기 토글로 생성된 token-map.ts 노출', () => {
    render(<TokenSyncPanel figmaJson={SAMPLE_JSON} />);
    expect(screen.queryByTestId('token-sync-generated-source')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '소스 보기' }));
    const src = screen.getByTestId('token-sync-generated-source');
    expect(src).toBeInTheDocument();
    expect(src).toHaveTextContent('export const FIGMA_TO_VAPOR_TOKENS');
  });

  it('소스 복사 클릭 시 clipboard.writeText 호출', () => {
    render(<TokenSyncPanel figmaJson={SAMPLE_JSON} />);
    fireEvent.click(screen.getByTestId('token-sync-copy-source'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('export const FIGMA_TO_VAPOR_TOKENS'),
    );
  });

  it('빈 variables 입력 시 안내 문구 노출', () => {
    render(<TokenSyncPanel figmaJson={{ variables: [] }} />);
    expect(screen.getByText(/Figma Variables JSON 이 비어 있습니다/)).toBeInTheDocument();
  });

  it('figmaJson 미지정 시 bundled fixture 로드', () => {
    render(<TokenSyncPanel />);
    expect(screen.getByTestId('token-sync-panel')).toBeInTheDocument();
    // bundled fixture contains brand/primary/base
    expect(screen.getByTestId('token-sync-row-brand/primary/base')).toBeInTheDocument();
  });
});
