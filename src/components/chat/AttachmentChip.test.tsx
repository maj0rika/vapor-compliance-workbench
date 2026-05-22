import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttachmentChip } from './AttachmentChip';

describe('AttachmentChip', () => {
  it('파일명과 사람이 읽을 수 있는 크기를 표시한다', () => {
    render(
      <AttachmentChip attachment={{ fileName: 'report.pdf', size: 1024 * 1024 }} />,
    );
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
  });
});
