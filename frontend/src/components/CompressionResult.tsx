import React from 'react';
import type { CompletedResponse } from '../api/compress';

interface CompressionResultProps {
  result: CompletedResponse;
  downloadUrl: string;
  formatFileSize: (bytes: number) => string;
  originalPreview?: string;
  onReset: () => void;
}

export const CompressionResult: React.FC<CompressionResultProps> = ({
  result,
  downloadUrl,
  formatFileSize,
  originalPreview,
  onReset,
}) => {
  const savingsPercent = (
    (1 - result.compressed_size / result.original_size) *
    100
  ).toFixed(1);

  return (
    <div className="compression-result">
      <h3>압축 결과</h3>

      <div className="result-comparison">
        {originalPreview && (
          <div className="result-image">
            <img src={originalPreview} alt="원본" />
            <span>원본 ({formatFileSize(result.original_size)})</span>
          </div>
        )}
      </div>

      <div className="result-stats">
        <div className="stat-item">
          <span className="stat-label">원본 크기</span>
          <span className="stat-value">{formatFileSize(result.original_size)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">압축 후</span>
          <span className="stat-value highlight">
            {formatFileSize(result.compressed_size)}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-label">압축률</span>
          <span className="stat-value accent">
            {result.ratio}배 ({savingsPercent}% 절감)
          </span>
        </div>
      </div>

      <div className="result-actions">
        <a
          href={downloadUrl}
          className="btn btn-primary"
          download
        >
          ⬇ 압축 파일 다운로드
        </a>
        <button className="btn btn-secondary" onClick={onReset}>
          새 이미지 압축
        </button>
      </div>
    </div>
  );
};
