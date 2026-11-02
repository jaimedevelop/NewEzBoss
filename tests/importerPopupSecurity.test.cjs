const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

test('extension popup renders scraped markup as text and rejects credential-bearing image URLs', () => {
  const elements = new Map(); const created = [];
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.classList = { add() {}, remove() {} }; this.style = {}; this.dataset = {}; }
    addEventListener() {}
    append(...nodes) { this.children.push(...nodes); }
    appendChild(node) { this.children.push(node); }
    set innerHTML(value) { assert.equal(value, '', 'untrusted popup rendering must use DOM nodes'); this.children = []; }
  }
  const document = {
    querySelectorAll() { return []; },
    getElementById(id) { if (!elements.has(id)) elements.set(id, new Element('div')); return elements.get(id); },
    createElement(tag) { created.push(tag); return new Element(tag); },
  };
  const supplier = { supplier: '<script>bad()</script>', sku: '<img onerror=bad()>', price: '12.00', imageUrl: 'https://key:secret@example.test/image' };
  const context = vm.createContext({ document, URL, console, setTimeout() {}, chrome: { storage: { local: { get(_keys, cb) { cb({ collectedSuppliers: [supplier] }); } } } } });
  vm.runInContext(fs.readFileSync('EzBossImporter_chrome_extension/popup.js', 'utf8'), context);
  assert.equal(created.includes('script'), false);
  assert.equal(created.includes('img'), false);
  assert.equal(elements.get('suppliersList').children.length, 1);
  const badge = elements.get('suppliersList').children[0].children[0].children[0];
  assert.equal(badge.textContent, supplier.supplier);
});
