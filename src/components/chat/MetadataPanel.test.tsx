import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetadataPanel } from './MetadataPanel';
import type { ArtifactMetadata, MetadataValidationResult } from '../../agent';

const FULL_METADATA: ArtifactMetadata = {
  componentName: 'PrimaryActionButton',
  primaryExport: 'PrimaryActionButton',
  defaultProps: { children: 'Action', disabled: false },
  variants: [
    { name: 'Default', props: { children: 'Action' } },
    { name: 'Disabled', props: { disabled: true } },
  ],
};

const PASS_VALIDATION: MetadataValidationResult = {
  status: 'pass',
  messages: [],
  warnings: [],
  errors: [],
};

const FAIL_VALIDATION: MetadataValidationResult = {
  status: 'fail',
  messages: ['primaryExport mismatch'],
  warnings: [],
  errors: ['primaryExport "MissingActionButton" does not match a component export.'],
};

describe('MetadataPanel (G015)', () => {
  it('metadata 미설정 시 fallback 안내', () => {
    render(<MetadataPanel />);
    expect(screen.getByText(/artifact-meta 가 비어 있습니다/)).toBeInTheDocument();
  });

  it('컴포넌트 이름과 primaryExport 를 testid 로 노출', () => {
    render(<MetadataPanel metadata={FULL_METADATA} validation={PASS_VALIDATION} />);
    expect(screen.getByTestId('metadata-component-name')).toHaveTextContent('PrimaryActionButton');
    expect(screen.getByTestId('metadata-primary-export')).toHaveTextContent('PrimaryActionButton');
  });

  it('defaultProps 각 키/값을 표시', () => {
    render(<MetadataPanel metadata={FULL_METADATA} />);
    const table = screen.getByTestId('metadata-default-props');
    expect(table).toHaveTextContent('children');
    expect(table).toHaveTextContent('"Action"');
    expect(table).toHaveTextContent('disabled');
    expect(table).toHaveTextContent('false');
  });

  it('variants 카드별 testid 부여', () => {
    render(<MetadataPanel metadata={FULL_METADATA} />);
    expect(screen.getByTestId('metadata-variant-Default')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-variant-Disabled')).toBeInTheDocument();
  });

  it('activeVariantName 이 있으면 선택된 variant 섹션 노출 + 활성 뱃지', () => {
    render(<MetadataPanel metadata={FULL_METADATA} activeVariantName="Disabled" />);
    expect(screen.getByTestId('metadata-selected-variant')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-selected-variant-props')).toHaveTextContent('disabled');
    expect(screen.getByText('활성')).toBeInTheDocument();
  });

  it('pass validation 은 검증 섹션을 숨긴다 (noise 차단)', () => {
    render(<MetadataPanel metadata={FULL_METADATA} validation={PASS_VALIDATION} />);
    expect(screen.queryByTestId('metadata-validation')).not.toBeInTheDocument();
  });

  it('fail validation 은 errors 를 한국어 헤더와 함께 노출', () => {
    render(<MetadataPanel metadata={FULL_METADATA} validation={FAIL_VALIDATION} />);
    expect(screen.getByTestId('metadata-validation')).toBeInTheDocument();
    expect(screen.getByText('실패')).toBeInTheDocument();
    expect(
      screen.getByText(/primaryExport "MissingActionButton" does not match/),
    ).toBeInTheDocument();
  });

  it('variants 빈 배열은 안내 문구 노출', () => {
    render(<MetadataPanel metadata={{ ...FULL_METADATA, variants: [] }} />);
    expect(screen.getByText(/variants 가 비어 있습니다/)).toBeInTheDocument();
  });
});
