import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  appType: 'spa',
  server: {
    middlewareMode: false,
    fs: {
      strict: false,
    },
    proxy: {
      '/serpapi': {
        target: 'https://serpapi.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/serpapi/, ''),
      },
    },
  },
});