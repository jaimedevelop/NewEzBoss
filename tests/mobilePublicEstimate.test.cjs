const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { build } = require('esbuild');

test('mobile shared estimate renders while the estimate is still loading', async () => {
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../src/mobile/client/views/ClientEstimateView.tsx')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['react', 'lucide-react'],
    plugins: [{ name: 'public-view-dependencies', setup(builder) {
      builder.onResolve({ filter: /^react-router-dom$/ }, () => ({ path: 'router', namespace: 'mock' }));
      // Keep the real document identity helper and tab visibility logic;
      // network services and child views are not needed during initial loading.
      builder.onResolve({ filter: /^(\.\/|\.\.\/)/ }, args => {
        if (/documentIdentity|estimates\.types|MobileTabBar/.test(args.path)) return;
        return { path: args.path, namespace: 'mock' };
      });
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents:
        args.path === 'router'
          ? 'export const useParams = () => ({ token: "shared-token" });'
          : 'export default () => null; export const getPublicEstimate = async () => null; export const PictureUploadGrid = () => null;'
      }));
    } }],
  });
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
  const html = renderToStaticMarkup(React.createElement(mod.exports.default));
  assert.match(html, /animate-spin/);
});
