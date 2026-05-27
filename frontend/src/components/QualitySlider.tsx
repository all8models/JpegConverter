import React from 'react';

interface QualitySliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const QUALITY_LABELS: Record<string, { label: string; desc: string }> = {
  '90-95': { label: '고품질', desc: '사진 보관용' },
  '75-85': { label: '웹 최적', desc: '웹 게시 권장' },
  '60-70': { label: '썸네일', desc: '미리보기용' },
  '30-50': { label: '극단 압축', desc: '최대 압축' },
};

function getQualityLabel(value: number): string {
  if (value >= 90) return QUALITY_LABELS['90-95'].label;
  if (value >= 75) return QUALITY_LABELS['75-85'].label;
  if (value >= 60) return QUALITY_LABELS['60-70'].label;
  return QUALITY_LABELS['30-50'].label;
}

function getQualityDesc(value: number): string {
  if (value >= 90) return QUALITY_LABELS['90-95'].desc;
  if (value >= 75) return QUALITY_LABELS['75-85'].desc;
  if (value >= 60) return QUALITY_LABELS['60-70'].desc;
  return QUALITY_LABELS['30-50'].desc;
}

export const QualitySlider: React.FC<QualitySliderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="quality-slider">
      <div className="slider-header">
        <span className="slider-label">압축 품질</span>
        <span className="slider-value">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="slider-input"
      />
      <div className="slider-info">
        <span className="quality-label">{getQualityLabel(value)}</span>
        <span className="quality-desc">{getQualityDesc(value)}</span>
      </div>
      <div className="slider-labels">
        <span>낮은 품질</span>
        <span>높은 품질</span>
      </div>
    </div>
  );
};
