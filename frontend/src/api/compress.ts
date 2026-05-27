import axios from 'axios';

const API_BASE = '/api';

export interface CompressParams {
  quality: number;
  max_width?: number;
  max_height?: number;
  strip_metadata: boolean;
  output_format: 'jpeg' | 'png';
}

export interface TaskResponse {
  task_id: string;
  status_url: string;
}

export interface StatusResponse {
  status: string;
  progress?: number;
}

export interface CompletedResponse {
  status: 'completed';
  download_url: string;
  original_size: number;
  compressed_size: number;
  ratio: number;
}

export interface ErrorResponse {
  status: 'error';
  message: string;
}

export async function uploadAndCompress(
  file: File,
  params: CompressParams,
): Promise<TaskResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('quality', String(params.quality));
  formData.append('strip_metadata', String(params.strip_metadata));
  formData.append('output_format', params.output_format);

  if (params.max_width) {
    formData.append('max_width', String(params.max_width));
  }
  if (params.max_height) {
    formData.append('max_height', String(params.max_height));
  }

  const response = await axios.post<TaskResponse>(
    `${API_BASE}/compress`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
  return response.data;
}

export async function checkStatus(
  taskId: string,
): Promise<StatusResponse | CompletedResponse | ErrorResponse> {
  const response = await axios.get(`${API_BASE}/status/${taskId}`);
  return response.data;
}

export function getDownloadUrl(taskId: string): string {
  return `${API_BASE}/download/${taskId}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
