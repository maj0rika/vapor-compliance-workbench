import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Button, Text } from '@vapor-ui/core';
import type { DropzoneProps } from './types';

/**
 * 파일 드래그&드롭 / 클릭 업로드를 담당하는 제품 컴포넌트.
 *
 * 키보드 사용자는 "파일 선택" 버튼으로 파일 대화상자를 열 수 있다.
 */
export function Dropzone({
  accept,
  multiple = false,
  disabled = false,
  onFiles,
}: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const emitFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onFiles(Array.from(fileList));
  };

  const openFileDialog = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    emitFiles(event.target.files);
    // 같은 파일을 다시 선택해도 change 가 발생하도록 값을 비운다.
    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    emitFiles(event.dataTransfer.files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-state={disabled ? 'disabled' : isDragOver ? 'dragover' : 'idle'}
      className={[
        'flex flex-col items-center gap-2 rounded-v-300 border border-dashed p-v-300 text-center transition-colors',
        disabled
          ? 'border-v-hint opacity-60'
          : isDragOver
            ? 'border-v-primary bg-v-primary-100'
            : 'border-v-normal',
      ].join(' ')}
    >
      <Text typography="body2" foreground="hint-200">
        파일을 여기에 끌어다 놓거나 버튼으로 선택하세요.
      </Text>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={openFileDialog}
        aria-label="파일 선택"
      >
        파일 선택
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept?.join(',')}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
