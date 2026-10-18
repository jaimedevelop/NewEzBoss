const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync('src/utils/pdfExport.ts', 'utf8').replace('import.meta.env.VITE_API_URL', "'https://api.example.com'"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }
).outputText;

function setup(fetch, decodeFails = false) {
  const state = { rendered: false, saved: false, decoded: false };
  const original = { querySelectorAll: () => [], getBoundingClientRect: () => ({ top: 0, width: 100 }), src: 'https://files.example.com/users/123/profile/test.png' };
  const clone = { removeAttribute() {}, async decode() {
    if (decodeFails) throw new Error('Invalid image');
    state.decoded = true;
  } };
  const exports = {};
  vm.runInNewContext(source, {
    exports, fetch,
    require(name) {
      if (name === 'jspdf') return class { addImage() {} setPage() {} setFontSize() {} setTextColor() {} text(value) { state.pageNumber = value; } save() { state.saved = true; } };
      return async (element, options) => {
        await options.onclone({}, { querySelectorAll: () => [clone] });
        assert.equal(state.decoded, true);
        assert.equal(clone.src, 'data:image/png;base64,bG9nbw==');
        state.rendered = true;
        return { width: 100, height: 100 };
      };
    },
    document: { createElement: () => ({ getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,' }) },
  });
  return { state, original, run: () => exports.downloadElementAsPdf({ querySelectorAll: (selector) => selector === 'img' ? [original] : [], getBoundingClientRect: () => ({ top: 0, width: 100 }) }, 'estimate.pdf') };
}

test('CORS failure embeds API logo and decodes before rendering without changing preview', async () => {
  const calls = [];
  const subject = setup(async (url) => {
    calls.push(url);
    if (calls.length === 1) throw new TypeError('Failed to fetch');
    return { ok: true, json: async () => ({ dataUrl: 'data:image/png;base64,bG9nbw==' }) };
  });
  await subject.run();
  assert.match(calls[1], /^https:\/\/api.example.com\/profile\/logo-data\?url=/);
  assert.equal(subject.original.src, 'https://files.example.com/users/123/profile/test.png');
  assert.equal(subject.state.saved, true);
  assert.equal(subject.state.pageNumber, 'Page 1 of 1');
});

test('failed image requests reject instead of saving a PDF with a missing logo', async () => {
  const subject = setup(async () => ({ ok: false }));
  await assert.rejects(subject.run(), /Unable to load the company logo/);
  assert.equal(subject.state.rendered, false);
  assert.equal(subject.state.saved, false);
});

test('invalid image bytes stop export before saving', async () => {
  let calls = 0;
  const subject = setup(async () => {
    if (++calls === 1) throw new TypeError('CORS');
    return { ok: true, json: async () => ({ dataUrl: 'data:image/png;base64,bG9nbw==' }) };
  }, true);
  await assert.rejects(subject.run(), /Invalid image/);
  assert.equal(subject.state.saved, false);
});

for (const totalsTop of [600, 780, 792]) {
  test(`totals at ${totalsTop} stay together across PDF pages`, async () => {
    const slices = [];
    const notices = [];
    let pages = 1;
    const numberedPages = [];
    const block = {
      getBoundingClientRect: () => ({ top: totalsTop, bottom: totalsTop + 250 }),
      hasAttribute: () => true,
    };
    const element = {
      getBoundingClientRect: () => ({ top: 0, width: 612 }),
      querySelectorAll: (selector) => selector.includes('data-pdf-totals') ? [block] : [],
    };
    const exports = {};
    vm.runInNewContext(source, {
      exports,
      require(name) {
        if (name === 'jspdf') return class {
          addImage() {} addPage() { pages++; } save() {}
          setPage(page) { numberedPages.push(page); }
          setFontSize() {} setTextColor() {}
          text(value) { notices.push(value); }
        };
        return async () => ({ width: 1224, height: (totalsTop + 250) * 2 });
      },
      document: { createElement: () => ({
        getContext: () => ({ drawImage(...args) { slices.push([args[2] / 2, args[4] / 2]); } }),
        toDataURL: () => '',
      }) },
    });
    await exports.downloadElementAsPdf(element, 'estimate.pdf');
    assert.equal(pages, 2);
    assert.equal(slices[0][1], totalsTop);
    assert.equal(slices[1][0], totalsTop);
    assert.equal(slices[1][1], 250);
    assert.deepEqual(numberedPages, [1, 2]);
    assert.deepEqual(notices, [...(totalsTop < 792 ? ['Totals on Next page'] : []), 'Page 1 of 2', 'Page 2 of 2']);
  });
}
