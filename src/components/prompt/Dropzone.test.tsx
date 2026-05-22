import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dropzone } from './Dropzone';

const makeFile = (name: string, type = '', sizeInBytes = 1): File =>
  new File(['x'.repeat(sizeInBytes)], name, { type });

const getFileInput = (): HTMLInputElement => {
  const input = document.querySelector('input[type="file"]');
  if (!input) throw new Error('file input not found');
  return input as HTMLInputElement;
};

describe('Dropzone', () => {
  it('허용된 파일을 선택하면 onFiles 가 호출된다', () => {
    const onFiles = vi.fn();
    render(<Dropzone accept={['.png']} onFiles={onFiles} />);

    fireEvent.change(getFileInput(), {
      target: { files: [makeFile('photo.png')] },
    });

    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0][0][0].name).toBe('photo.png');
  });

  it('허용되지 않은 확장자는 onReject 로 거부하고 onFiles 는 호출하지 않는다', () => {
    const onFiles = vi.fn();
    const onReject = vi.fn();
    render(<Dropzone accept={['.png']} onFiles={onFiles} onReject={onReject} />);

    fireEvent.change(getFileInput(), {
      target: { files: [makeFile('virus.exe')] },
    });

    expect(onFiles).not.toHaveBeenCalled();
    expect(onReject).toHaveBeenCalledWith({
      fileName: 'virus.exe',
      reason: 'unaccepted-type',
    });
  });

  it('거부 시 사유 Callout 을 표시한다', () => {
    render(<Dropzone accept={['.png']} onFiles={vi.fn()} />);

    fireEvent.change(getFileInput(), {
      target: { files: [makeFile('virus.exe')] },
    });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('virus.exe');
    expect(alert).toHaveTextContent('지원하지 않는 파일 형식입니다.');
  });

  it('maxSize 를 초과한 파일을 거부한다', () => {
    const onReject = vi.fn();
    render(<Dropzone maxSize={10} onFiles={vi.fn()} onReject={onReject} />);

    fireEvent.change(getFileInput(), {
      target: { files: [makeFile('big.png', 'image/png', 100)] },
    });

    expect(onReject).toHaveBeenCalledWith({
      fileName: 'big.png',
      reason: 'exceeds-max-size',
    });
  });

  it('드롭으로도 파일을 전달한다', () => {
    const onFiles = vi.fn();
    render(<Dropzone accept={['.png']} onFiles={onFiles} />);

    const zone = screen.getByText(/끌어다 놓거나/).closest('div')!;
    fireEvent.drop(zone, {
      dataTransfer: { files: [makeFile('dropped.png')] },
    });

    expect(onFiles).toHaveBeenCalledTimes(1);
  });

  it('disabled 상태에서는 파일 선택 버튼이 비활성화된다', () => {
    render(<Dropzone disabled onFiles={vi.fn()} />);
    expect(screen.getByRole('button', { name: '파일 선택' })).toBeDisabled();
  });
});
