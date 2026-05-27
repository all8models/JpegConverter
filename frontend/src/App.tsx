import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { QualitySlider } from './components/QualitySlider';
import { ProgressBar } from './components/ProgressBar';
import { CompressionResult } from './components/CompressionResult';
import { useCompression } from './hooks/useCompression';

type OutputFormat = 'jpeg' | 'png';

const App: React.FC = () => {
  const [quality, setQuality] = useState(75);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg');
  const [stripMetadata, setStripMetadata] = useState(true);

  const {
    status,
    progress,
    originalFile,
    originalPreview,
    result,
    error,
    downloadUrl,
    startCompression,
    reset,
    formatFileSize,
  } = useCompression();

  const handleFileSelect = (file: File) => {
    startCompression(file, {
      quality,
      strip_metadata: stripMetadata,
      output_format: outputFormat,
    });
  };

  const isProcessing = status === 'uploading' || status === 'processing';

  return (
    <div className="app">
      <header className="app-header">
        <h1>🖼️ 이미지 압축 서비스</h1>
        <p className="app-subtitle">
          JPEG 압축 원리를 기반으로 이미지 크기를 최적화하세요
        </p>
      </header>

      <main className="app-main">
        {status === 'idle' && (
          <div className="control-panel">
            <div className="options-section">
              <QualitySlider
                value={quality}
                onChange={setQuality}
              />

              <div className="option-row">
                <label className="option-label">출력 포맷</label>
                <div className="option-toggle">
                  <button
                    className={`toggle-btn ${outputFormat === 'jpeg' ? 'active' : ''}`}
                    onClick={() => setOutputFormat('jpeg')}
                  >
                    JPEG
                  </button>
                  <button
                    className={`toggle-btn ${outputFormat === 'png' ? 'active' : ''}`}
                    onClick={() => setOutputFormat('png')}
                  >
                    PNG
                  </button>
                </div>
              </div>

              <div className="option-row">
                <label className="option-label">
                  <input
                    type="checkbox"
                    checked={stripMetadata}
                    onChange={(e) => setStripMetadata(e.target.checked)}
                  />
                  메타데이터(EXIF) 제거
                </label>
              </div>
            </div>

            <FileUploader onFileSelect={handleFileSelect} />
          </div>
        )}

        {(status === 'uploading' || status === 'processing') && (
          <div className="progress-section">
            {originalPreview && (
              <div className="preview-image">
                <img src={originalPreview} alt="업로드된 이미지" />
              </div>
            )}
            {originalFile && (
              <p className="file-info">
                {originalFile.name} ({formatFileSize(originalFile.size)})
              </p>
            )}
            <ProgressBar progress={progress} status={status} />
            <button
              className="btn btn-secondary"
              onClick={reset}
            >
              취소
            </button>
          </div>
        )}

        {status === 'completed' && result && downloadUrl && (
          <CompressionResult
            result={result}
            downloadUrl={downloadUrl}
            formatFileSize={formatFileSize}
            originalPreview={originalPreview}
            onReset={reset}
          />
        )}

        {status === 'error' && (
          <div className="error-section">
            <div className="error-icon">❌</div>
            <p className="error-message">{error}</p>
            <button className="btn btn-primary" onClick={reset}>
              다시 시도
            </button>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>
          업로드된 이미지는 압축 후 즉시 삭제됩니다. 개인정보는 안전하게 보호됩니다.
        </p>
      </footer>
    </div>
  );
};

export default App;
