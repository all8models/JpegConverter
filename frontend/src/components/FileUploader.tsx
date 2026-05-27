import React, { useCallback, useRef, useState } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('JPEG, PNG, WebP 파일만 업로드 가능합니다.');
      return false;
    }
    if (file.size > MAX_SIZE) {
      setError('파일 크기는 25MB를 초과할 수 없습니다.');
      return false;
    }
    return true;
  };

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (validateFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div
      className={`file-uploader ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        hidden
        disabled={disabled}
      />
      <div className="uploader-content">
        <div className="uploader-icon">📁</div>
        <p className="uploader-text">
          {isDragging
            ? '여기에 파일을 놓으세요'
            : '이미지를 드래그하거나 클릭하여 업로드'}
        </p>
        <p className="uploader-hint">
          JPEG, PNG, WebP (최대 25MB)
        </p>
      </div>
      {error && <p className="uploader-error">{error}</p>}
    </div>
  );
};
