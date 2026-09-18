import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Only values explicitly needed by browser code may be injected into a
  // client build. Adding a VITE_ secret to a hosting environment is not
  // enough to expose it accidentally.
  envPrefix: [
    'VITE_API_URL',
    'VITE_AUTH0_AUDIENCE',
    'VITE_AUTH0_CLIENT_ID',
    'VITE_AUTH0_DOMAIN',
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_STRIPE_PUBLISHABLE_KEY',
  ],
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
