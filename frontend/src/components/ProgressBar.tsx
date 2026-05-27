import React from 'react';

interface ProgressBarProps {
  progress: number;
  status: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status }) => {
  const statusText: Record<string, string> = {
    uploading: '파일 업로드 중...',
    processing: '이미지 압축 중...',
    completed: '압축 완료!',
    error: '오류 발생',
  };

  return (
    <div className="progress-bar-container">
      <div className="progress-status">{statusText[status] || status}</div>
      <div className="progress-track">
        <div
          className={`progress-fill ${status === 'completed' ? 'completed' : ''} ${status === 'error' ? 'error' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="progress-percentage">{progress}%</div>
    </div>
  );
};
