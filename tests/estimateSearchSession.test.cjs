const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');

test('estimate search survives remounts, stays scoped to the user, and clears at session end', async () => {
  const result = await build({ entryPoints: ['src/pages/estimates/estimateSearchSession.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' });
  const mod = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports);
  const { estimateSearchSessionKey: key, readEstimateSearchSession: read, writeEstimateSearchSession: write, clearEstimateSearchSession: clear } = mod.exports;
  const items = new Map();
  global.sessionStorage = {
    get length() { return items.size; },
    key: index => [...items.keys()][index] ?? null,
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key),
  };
  write(key('user-a'), 'Kitchen');
  assert.equal(read(key('user-a')), 'Kitchen');
  assert.equal(read(key('user-b')), '');
  write(key('user-a'), '');
  assert.equal(read(key('user-a')), '');
  write(key('user-a'), 'Kitchen');
  write(key('user-b'), 'Bathroom');
  items.set('unrelated', 'keep');
  clear();
  assert.equal(read(key('user-a')), '');
  assert.equal(read(key('user-b')), '');
  assert.equal(items.get('unrelated'), 'keep');
  delete global.sessionStorage;
  assert.equal(read(key('user-a')), '');
  assert.doesNotThrow(() => write(key('user-a'), 'Kitchen'));
  assert.doesNotThrow(clear);
});
