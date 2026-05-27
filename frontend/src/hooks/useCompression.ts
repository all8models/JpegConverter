import { useState, useCallback, useRef } from 'react';
import {
  uploadAndCompress,
  checkStatus,
  getDownloadUrl,
  formatFileSize,
  type CompressParams,
  type CompletedResponse,
} from '../api/compress';

interface CompressionState {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  taskId?: string;
  result?: CompletedResponse;
  error?: string;
  originalFile?: File;
  originalPreview?: string;
}

export function useCompression() {
  const [state, setState] = useState<CompressionState>({
    status: 'idle',
    progress: 0,
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startCompression = useCallback(
    async (file: File, params: CompressParams) => {
      stopPolling();

      // 미리보기 URL 생성
      const previewUrl = URL.createObjectURL(file);

      setState({
        status: 'uploading',
        progress: 0,
        originalFile: file,
        originalPreview: previewUrl,
      });

      try {
        // 업로드 및 압축 요청
        const { task_id } = await uploadAndCompress(file, params);

        setState((prev) => ({
          ...prev,
          status: 'processing',
          progress: 10,
          taskId: task_id,
        }));

        // 폴링으로 상태 확인
        let errorCount = 0;
        pollingRef.current = setInterval(async () => {
          try {
            const result = await checkStatus(task_id);

            // 성공 시 오류 카운터 리셋
            errorCount = 0;

            if (result.status === 'completed') {
              stopPolling();
              const completed = result as CompletedResponse;
              setState((prev) => ({
                ...prev,
                status: 'completed',
                progress: 100,
                result: completed,
              }));
            } else if (result.status === 'error') {
              stopPolling();
              setState((prev) => ({
                ...prev,
                status: 'error',
                error: (result as any).message || '압축 중 오류가 발생했습니다.',
              }));
            } else if (result.status === 'processing') {
              setState((prev) => ({
                ...prev,
                progress: Math.max(prev.progress, result.progress || 10),
              }));
            }
          } catch (err: any) {
            // 네트워크 일시적 오류는 3회까지 허용, 이후 에러 표시
            errorCount++;
            if (errorCount >= 3) {
              stopPolling();
              setState((prev) => ({
                ...prev,
                status: 'error',
                error: '서버 연결이 원활하지 않습니다. 다시 시도해주세요.',
              }));
            }
          }
        }, 1000);
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err?.response?.data?.detail || err?.message || '압축 요청 중 오류가 발생했습니다.',
        }));
      }
    },
    [stopPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    if (state.originalPreview) {
      URL.revokeObjectURL(state.originalPreview);
    }
    setState({
      status: 'idle',
      progress: 0,
    });
  }, [state.originalPreview, stopPolling]);

  return {
    ...state,
    startCompression,
    reset,
    downloadUrl: state.taskId ? getDownloadUrl(state.taskId) : null,
    formatFileSize,
  };
}
