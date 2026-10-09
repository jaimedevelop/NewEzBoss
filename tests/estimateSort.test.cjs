const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
test('column cycles, natural grouping, rotation, stable ties and reset', async () => {
  const result = await build({ entryPoints: ['src/pages/estimates/estimateSort.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' });
  const mod = { exports: {} };
  new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports);
  const { nextColumnSort, sortEstimateColumns: sort } = mod.exports;
  for (const [column, count] of [['document',2],['customer',2],['po',2],['address',2],['date',2],['total',2],['type',4],['status',7]]) {
    let state = null;
    for (let step = 0; step < count; step++) { state = nextColumnSort(state, column); assert.deepEqual(state, { column, step }); }
    assert.equal(nextColumnSort(state, column), null);
  }
  const rows = [
    { id:'inv', estimateState:'invoice', invoiceNumber:'INV-2', poNumber:'B2', clientState:'denied', total:10 },
    { id:'10', estimateState:'estimate', estimateNumber:'EST-10', poNumber:'A10', clientState:'sent', total:2 },
    { id:'2', estimateState:'estimate', estimateNumber:'EST-2', poNumber:'A2', clientState:'viewed', total:2 },
    { id:'blank', estimateState:'draft' },
  ];
  const ids = (column, step) => sort(rows, { column, step }).map(row => row.id);
  assert.deepEqual(ids('document',0), ['2','10','blank','inv']);
  assert.deepEqual(ids('document',1), ['10','2','blank','inv']);
  assert.deepEqual(ids('po',0), ['2','10','inv','blank']);
  assert.deepEqual(ids('po',1), ['10','2','inv','blank']);
  assert.deepEqual(ids('type',1), ['inv','blank','10','2']);
  assert.deepEqual(ids('status',3), ['inv','blank','10','2']);
  assert.deepEqual(ids('total',1), ['inv','10','2','blank']);
  assert.equal(sort(rows,null), rows);
  assert.deepEqual(rows.map(row => row.id), ['inv','10','2','blank']);
});
