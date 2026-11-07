import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSupplierPackage } from '../src/services/security/supplierPackage';
import { handler } from '../netlify/functions/proxy';
const valid = () => ({ suppliers: [{ supplier: '<b>Supplier</b>', sku: 'SKU', price: '12.34' }], selectedImage: 'https://images.example.test/image.jpg', timestamp: Date.now() });
test('supplier ingestion projects bounded data and rejects malformed packages', () => {
  assert.equal(parseSupplierPackage(valid())?.suppliers[0].supplier, '<b>Supplier</b>');
  for (const invalid of [null, {}, { ...valid(), suppliers: Array(51).fill(valid().suppliers[0]) },
    { ...valid(), suppliers: [{ supplier: 'a', sku: 'b', price: 'Infinity' }] },
    { ...valid(), suppliers: [{ supplier: 'a'.repeat(101), sku: 'b', price: '1' }] },
    { ...valid(), timestamp: 1 }, { ...valid(), selectedImage: 'javascript:alert(1)' },
    { ...valid(), selectedImage: 'https://key:secret@example.test/image' },
  ]) assert.equal(parseSupplierPackage(invalid), null);
});
test('retired public relay rejects every caller without any upstream fetch', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('upstream must not be reached'); };
  try {
    for (const httpMethod of ['GET', 'POST', 'OPTIONS', 'DELETE']) {
      const result = await (handler as any)({ httpMethod, path: '/proxy/openai/v1/chat/completions', body: 'secret' });
      assert.equal(result.statusCode, 410);
      assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
    }
  } finally { globalThis.fetch = oldFetch; }
});

import { aiPreferences, migrateBrowserCredentials } from '../src/services/security/browserStorage';
test('startup migration purges legacy app credentials while preserving the SDK session and nonsecret AI choices', () => {
  const storage = Object.create(null);
  Object.defineProperties(storage, {
    getItem: { value(key: string) { return this[key] ?? null; } },
    setItem: { value(key: string, value: string) { this[key] = value; } },
    removeItem: { value(key: string) { delete this[key]; } },
  });
  storage['@@auth0spajs@@::old'] = 'SDK_SESSION';
  storage.ezboss_client_portal_token = 'PORTAL_SECRET';
  storage['collection_ai_settings:alice'] = JSON.stringify({ provider: 'openai', modelId: 'openai:example', apiKey: 'AI_SECRET', apiKeys: { openai: 'AI_SECRET' }, customProviders: [{ baseUrl: 'https://user:SECRET@example.test' }] });
  storage.unrelated = 'keep';
  migrateBrowserCredentials(storage);
  const serialized = JSON.stringify(storage);
  assert.equal(serialized.includes('SECRET'), false);
  assert.equal(storage['@@auth0spajs@@::old'], 'SDK_SESSION');
  assert.equal(storage.unrelated, 'keep');
  assert.equal(JSON.parse(storage['collection_ai_settings:alice']).modelId, 'openai:example');
  assert.deepEqual(aiPreferences({ provider: 'openai', apiKeys: { openai: 'secret' } }).apiKeys, {});
});
