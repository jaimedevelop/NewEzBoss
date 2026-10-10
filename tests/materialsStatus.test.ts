import assert from 'node:assert/strict';
import test from 'node:test';
import { materialsStatus } from '../src/services/purchasing/materialsStatus';
import type { ProcurementPreview, ProcurementRequirement } from '../src/services/purchasing/purchasing.inventory';
const line = (fields: Partial<ProcurementRequirement> = {}): ProcurementRequirement => ({ productId: 1, name: 'Pipe', required: 10, available: 0, reservedQuantity: 0, issuedQuantity: 0, shortage: 10, orderQuantity: 10, unitCost: 2, priceMissing: false, ownOutstandingOrder: 0, excessCommitment: 0, ...fields });
const preview = (fields: Partial<ProcurementPreview> = {}): ProcurementPreview => ({ workOrderStatus: null, purchaseOrders: [], stockedRequirements: [], orderRequirements: [], unresolved: [], unsupportedProcurement: [], poNeeded: false, ...fields });
test('quantity shortages distinguish full and partial purchasing, including partial stock of a single item', () => {
  assert.equal(materialsStatus(preview({ poNeeded: true, orderRequirements: [line()] })), 'Purchase required');
  assert.equal(materialsStatus(preview({ poNeeded: true, orderRequirements: [line({ available: 3, shortage: 7 })] })), 'Partial purchase required');
});
test('draft and inbound orders cover buying but do not mean ready', () => {
  for (const [status, label] of [['draft', 'Purchase order drafted'], ['ordered', 'Awaiting materials'], ['partially_received', 'Partially received']]) {
    assert.equal(materialsStatus(preview({ purchaseOrders: [{ id: 'po', status }], stockedRequirements: [line({ shortage: 0, ownOutstandingOrder: 10 })] })), label);
  }
});
test('assigned and previously issued materials cover the job without being purchased again', () => {
  assert.equal(materialsStatus(preview({ stockedRequirements: [line({ shortage: 0, reservedQuantity: 10, available: 10 })] })), 'Materials ready');
  assert.equal(materialsStatus(preview({ stockedRequirements: [line({ shortage: 0, issuedQuantity: 10 })] })), 'Materials ready');
  assert.equal(materialsStatus(preview()), 'No purchase required');
});
test('revisions require additional buying; cancelled orders do not cover demand', () => {
  assert.equal(materialsStatus(preview({ poNeeded: true, orderRequirements: [line()], purchaseOrders: [{ id: 'po', status: 'ordered' }] })), 'Additional purchase required');
  assert.equal(materialsStatus(preview({ poNeeded: true, orderRequirements: [line()], purchaseOrders: [{ id: 'po', status: 'cancelled' }] })), 'Purchase required');
});
test('unresolved inventory and tools require review; closed jobs cannot look like new shortages', () => {
  assert.equal(materialsStatus(preview({ unresolved: [{}] })), 'Needs review');
  assert.equal(materialsStatus(preview({ unsupportedProcurement: [{}] })), 'Needs review');
  assert.equal(materialsStatus(preview({ workOrderStatus: 'completed', poNeeded: true })), 'Job complete');
});
