const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { setImmediate: settle } = require('node:timers/promises');
const ts = require('typescript');

function load(relativePath, modules, globals = {}) {
  const source = readFileSync(new URL(relativePath, `file://${__filename}`), 'utf8')
    .replace('import.meta.env.VITE_API_URL', '"https://api.test"');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const exports = {};
  new Function('require', 'exports', ...Object.keys(globals), outputText)(
    name => {
      assert.ok(modules[name], name);
      return modules[name];
    },
    exports,
    ...Object.values(globals),
  );
  return exports;
}

test('pending and confirmed inventory deletes survive navigation and stale reads; a failed delete restores only its own row', async () => {
  let company = 'company-a';
  const alerts = [];
  const { useInventoryDeletion } = load('../src/pages/inventory/useInventoryDeletion.ts', {
    react: { useSyncExternalStore: (_subscribe, snapshot) => snapshot() },
    '../../services/companySession': { companyCacheScope: () => company },
  }, { window: { confirm: () => true, alert: message => alerts.push(message) } });
  const requests = new Map();
  const remove = id => new Promise(resolve => {
    assert.ok(!requests.has(id), `Duplicate request for ${id}`);
    requests.set(id, resolve);
  });
  for (const kind of ['products', 'equipment', 'tools', 'labor']) {
    const first = `${kind}-first`;
    const second = `${kind}-second`;
    const view = () => useInventoryDeletion(kind, remove);
    view().deleteItem(first, kind);
    view().deleteItem(first, kind);
    view().deleteItem(second, kind);
    assert.deepEqual([...view().hidden], [first, second]);

    // Both pending IDs may appear in a new list response after creating a row.
    const freshList = [first, 'newly created row', second];
    assert.deepEqual(freshList.filter(id => !view().hidden.has(id)), ['newly created row']);

    requests.get(second)({ success: true });
    requests.get(first)({ success: false, error: 'Access denied.' });
    await settle();
    assert.deepEqual(freshList.filter(id => !view().hidden.has(id)), [first, 'newly created row']);
  }
  assert.ok(useInventoryDeletion('products', remove).hidden.has('products-second'));
  assert.equal(useInventoryDeletion('labor', remove).hidden.has('products-second'), false);
  assert.equal(alerts.length, 4);
  assert.match(alerts[0], /Access denied/);
  company = 'company-b';
  assert.equal(useInventoryDeletion('products', remove).hidden.size, 0);
});

test('DELETE retries transient failures and treats a missing record as already deleted', async () => {
  let company = 'company-a';
  let responses = [new TypeError('Offline'), 503, 404];
  const requests = [];
  const { deleteInventoryRecord } = load('../src/services/inventory/inventoryApi.ts', {
    '../apiAuth': { getApiAccessToken: async () => 'token' },
    '../companySession': { companyCacheScope: () => company },
  }, {
    fetch: async (url, options) => {
      requests.push({ url, options });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return { status: response, ok: response === 204, json: async () => ({ error: 'Rejected' }) };
    },
    setTimeout: callback => callback(),
  });
  await deleteInventoryRecord('/inventory/products/12');
  assert.equal(requests.length, 3);
  assert.ok(requests.every(({ url, options }) => url.endsWith('/inventory/products/12') && options.method === 'DELETE'));

  responses = [409];
  await assert.rejects(deleteInventoryRecord('/inventory/products/13'), { status: 409 });
  assert.equal(requests.length, 4);

  const pending = deleteInventoryRecord('/inventory/tools/12');
  company = 'company-b';
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(requests.length, 4);

  responses = [503, 503, 503, 503];
  await assert.rejects(deleteInventoryRecord('/inventory/tools/13'), { status: 503 });
  assert.equal(requests.length, 8);
});
