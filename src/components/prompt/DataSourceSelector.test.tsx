import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataSourceSelector } from './DataSourceSelector';
import type { DataSourceOption } from './types';

const OPTIONS: DataSourceOption[] = [
  { id: 'docs', label: '문서' },
  { id: 'web', label: '웹 검색' },
  { id: 'code', label: '코드베이스' },
];

const renderSelector = (
  props: Partial<Parameters<typeof DataSourceSelector>[0]> = {},
) =>
  render(
    <DataSourceSelector
      options={OPTIONS}
      selected={[]}
      onChange={() => {}}
      {...props}
    />,
  );

/** 선택 요약 영역의 텍스트. (트리거에도 라벨이 중복 노출되므로 마지막 요소를 본다.) */
const getSummary = (text: string) => {
  const matches = screen.getAllByText(text);
  return matches[matches.length - 1];
};

describe('DataSourceSelector', () => {
  it('선택값이 없으면 기본 안내를 표시한다', () => {
    renderSelector();
    expect(screen.getByText('선택된 데이터소스 없음')).toBeInTheDocument();
  });

  it('선택된 단일 데이터소스를 요약에 표시한다', () => {
    renderSelector({ selected: ['web'] });
    expect(getSummary('웹 검색')).toBeInTheDocument();
  });

  it('다중 모드에서 선택된 여러 데이터소스를 요약에 표시한다', () => {
    renderSelector({ multiple: true, selected: ['docs', 'code'] });
    expect(screen.getByText('문서, 코드베이스')).toBeInTheDocument();
  });

  it('선택을 해제하면 요약이 기본 안내로 돌아간다', () => {
    const { rerender } = renderSelector({ multiple: true, selected: ['docs'] });
    expect(getSummary('문서')).toBeInTheDocument();

    rerender(
      <DataSourceSelector
        options={OPTIONS}
        selected={[]}
        multiple
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('선택된 데이터소스 없음')).toBeInTheDocument();
  });

  it('disabled 상태에서는 트리거가 비활성화된다', () => {
    renderSelector({ disabled: true });
    expect(screen.getByLabelText('데이터소스 선택')).toBeDisabled();
  });
});
