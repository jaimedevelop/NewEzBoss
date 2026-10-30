const test = require('node:test');
const assert = require('node:assert/strict');
const { transformSync } = require('esbuild');
const fs = require('node:fs');
const source = fs.readFileSync('src/components/common/imageSourceIdentity.ts', 'utf8');
const compiled = transformSync(source, { loader: 'ts', format: 'cjs' }).code;
const loaded = { exports: {} };
new Function('module', 'exports', compiled)(loaded, loaded.exports);
const { imageSourceIdentity } = loaded.exports;
const signed = (fields = {}, origin = 'https://api.example.com') => `${origin}/private-files/${Buffer.from(JSON.stringify({ key: 'private/estimate/café.jpg', type: 'image/jpeg', disposition: 'inline', exp: 100, ...fields })).toString('base64url')}.signature`;

test('renewed private grants keep the same photo identity', () => {
  assert.equal(imageSourceIdentity(signed()), imageSourceIdentity(signed({ exp: 200 })));
});
test('different content and delivery origins have different identities', () => {
  assert.notEqual(imageSourceIdentity(signed()), imageSourceIdentity(signed({ key: 'private/estimate/other.jpg' })));
  assert.notEqual(imageSourceIdentity(signed()), imageSourceIdentity(signed({}, 'https://other.example.com')));
});
test('ordinary, local, and malformed sources retain their full identity', () => {
  for (const src of ['blob:local-photo', 'https://example.com/photo.jpg?v=1', 'https://example.com/private-files/broken.sig', '']) {
    assert.equal(imageSourceIdentity(src), src);
  }
  assert.notEqual(imageSourceIdentity('https://example.com/photo.jpg?v=1'), imageSourceIdentity('https://example.com/photo.jpg?v=2'));
});
