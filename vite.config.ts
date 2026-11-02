import { defineConfig, loadEnv } from 'vite';
import { securityHeaders } from './scripts/security-headers.mjs';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), {
    name: 'deployment-security-headers',
    apply: 'build',
    generateBundle() {
      const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
      this.emitFile({ type: 'asset', fileName: '_headers', source: securityHeaders(env) });
    },
  }],
  // Only values explicitly needed by browser code may be injected into a
  // client build. Adding a VITE_ secret to a hosting environment is not
  // enough to expose it accidentally.
  envPrefix: [
    'VITE_API_URL',
    'VITE_AUTH0_AUDIENCE',
    'VITE_AUTH0_CLIENT_ID',
    'VITE_AUTH0_DOMAIN',
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
  },
}));
