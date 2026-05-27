import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Docker 환경에서는 backend 호스트명, 로컬 개발에서는 localhost 사용
const BACKEND_HOST = process.env.VITE_BACKEND_HOST || 'localhost';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: `http://${BACKEND_HOST}:8000`,
        changeOrigin: true,
      },
    },
  },
});
