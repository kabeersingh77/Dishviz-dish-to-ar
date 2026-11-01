import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy API calls and static assets to backend in development
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/static': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Code splitting — 3D viewer only loads on result page
    rollupOptions: {
      output: {
        manualChunks: {
          'model-viewer': ['@google/model-viewer'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
