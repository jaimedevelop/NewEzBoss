const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('multiple photos upload sequentially with one file per request and retain descriptions', async () => {
  const exports = {};
  let active = 0;
  const uploads = [];
  const source = ts.transpileModule(fs.readFileSync('src/services/estimates/estimates.files.ts', 'utf8')
    .replace('import.meta.env.VITE_API_URL', "'https://api.example.com'"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, {
    exports, require: () => ({ getApiAccessToken: async () => 'test' }),
    FormData: class { files = []; append(key, file) { this.files.push(file); } },
    fetch: async (url, options) => {
      assert.equal(++active, 1);
      assert.equal(options.body.files.length, 1);
      uploads.push(options.body.files[0].name);
      await new Promise(resolve => setImmediate(resolve));
      active--;
      return { ok: true, json: async () => [{ id: uploads.length, url: `https://files/${uploads.length}` }] };
    },
  });
  const result = await exports.uploadEstimateImages(['first', 'second'].map(name => ({
    file: { name, type: 'image/png' }, url: 'blob:preview', description: name,
  })), '51');
  assert.deepEqual(uploads, ['first', 'second']);
  assert.equal(result[0].description, 'first');
  assert.equal(result[1].description, 'second');
});
