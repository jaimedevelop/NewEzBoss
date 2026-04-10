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
      '/proxy/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/proxy\/anthropic/, ''),
      },
      '/proxy/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/proxy\/openai/, ''),
      },
      '/proxy/google': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/proxy\/google/, ''),
      },
      '/proxy/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/proxy\/deepseek/, ''),
      },
    },
  },
});