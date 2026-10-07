const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const path = require('node:path');

test('client editor opens from historical estimate details without fetching a deleted client', async () => {
  const result = await build({
    entryPoints: [path.resolve('src/pages/estimates/components/EstimateClientModal.tsx')],
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    plugins: [{ name: 'mocks', setup(b) {
      b.onResolve({ filter: /^react$|^react\/jsx-runtime$|ClientsCreationModal$/ }, a => ({ path: a.path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents:
        a.path === 'react' ? 'export const useMemo = fn => fn();' :
        a.path === 'react/jsx-runtime' ? 'export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx;' :
        'export default function ClientForm() {}'
      }));
      b.onResolve({ filter: /services\/clients$/ }, () => { throw new Error('Estimate editor must not fetch clients'); });
    } }],
  });
  const mod = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports);
  let saved;
  const props = {
    value: { customerId: 'deleted-client', customerName: 'Historical name', customerEmail: 'old@example.com',
      serviceAddress: '', clientSnapshot: { name: 'New name', companyName: 'Acme', billingAddress: '123 Main', serviceAddress: 'Previous address', userId: '1' } },
    onClose() {}, onChangeClient() {}, onSave(client) { saved = client; return true; },
  };
  const editor = mod.exports.default(props);
  assert.equal(editor.props.snapshotOnly, true);
  assert.equal(editor.props.client.name, 'Historical name');
  assert.equal(editor.props.client.companyName, 'Acme');
  assert.equal(editor.props.client.billingAddress, '123 Main');
  assert.equal(editor.props.client.serviceAddress, '');
  await editor.props.onSave({ ...editor.props.client, name: 'Edited snapshot' });
  assert.equal(saved.name, 'Edited snapshot');
  const legacy = mod.exports.default({ ...props, value: { customerName: 'Legacy', customerEmail: '' } });
  assert.equal(legacy.props.client.name, 'Legacy');
});
