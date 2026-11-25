import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateCollectionLaborPricing,
  getCollectionClientProfiles,
} from '../src/services/collections/labor-pricing';
import type { ItemSelection } from '../src/services/collections/collections.types';
import type { LaborItem } from '../src/services/inventory/labor/labor.types';

const selection: ItemSelection = { isSelected: true, quantity: 2, categoryTabId: 'labor', addedAt: 0 };
const labor = {
  estimatedHours: 3,
  flatRates: [{ rate: 125 }],
  hourlyRates: [{ id: 'standard', hourlyRate: 30 }],
  pricingProfiles: [
    { id: 'flat', strategy: 'flat', baseRate: 300 },
    { id: 'tiered', strategy: 'tiered', unit: 'hours', baseRate: 200, includedUnits: 4, overageRate: 50 },
    { id: 'hourly', strategy: 'hourly_passthrough', baseRate: 75 },
    { id: 'legacy', strategy: 'measured', baseRate: 90 },
  ],
} as LaborItem;

test('saved labor without a client profile retains its legacy total and resolves the sole contractor rate', () => {
  const result = calculateCollectionLaborPricing(labor, { ...selection, estimatedHours: 5 });
  assert.equal(result.clientTotal, 250);
  assert.equal(result.selectedContractorRate?.id, 'standard');
  assert.equal(result.contractorCost, 300);
});

test('collection client pricing lists supported profiles and calculates each pricing strategy', () => {
  assert.deepEqual(getCollectionClientProfiles(labor).map(profile => profile.id), ['flat', 'tiered', 'hourly']);
  const prices = ['flat', 'tiered', 'hourly'].map(selectedClientProfileId => calculateCollectionLaborPricing(labor, {
    ...selection, selectedClientProfileId, estimatedHoursOverridden: true, estimatedHours: 5,
  }).clientTotal);
  assert.deepEqual(prices, [300, 250, 375]);
});

test('multiple contractor rates require a choice independent of client pricing', () => {
  const multipleRates = { ...labor, hourlyRates: [...labor.hourlyRates!, { id: 'senior', name: 'Senior', hourlyRate: 45 }] };
  const unassigned = calculateCollectionLaborPricing(multipleRates, selection);
  assert.equal(unassigned.selectedContractorRate, undefined);
  assert.equal(unassigned.contractorCost, 0);
  const assigned = calculateCollectionLaborPricing(multipleRates, { ...selection, selectedContractorRateId: 'senior' });
  assert.equal(assigned.contractorCost, 270);
  assert.equal(assigned.clientTotal, 250);
});
