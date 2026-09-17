import test from 'node:test';
import assert from 'node:assert/strict';
import { apiRowToCollection } from '../src/services/collections/collections.mapper';

const row = (coverImageUrl?: string | null, coverImageStorageKey?: string | null) => ({
  id: 42,
  name: 'Kitchen refresh',
  category: 'Carpentry',
  categorySelection: { sections: [], categories: [], subcategories: [] },
  coverImageUrl,
  coverImageStorageKey,
});

test('collection mapper accepts legacy missing/null cover metadata', () => {
  assert.equal(apiRowToCollection(row()).coverImageUrl, undefined);
  assert.equal(apiRowToCollection(row(null, null)).coverImageStorageKey, undefined);
});

test('collection mapper propagates cover metadata from list and detail rows', () => {
  const collection = apiRowToCollection(row('https://files.example/covers/a.webp', 'users/7/collections/42/covers/a.webp'));
  assert.equal(collection.coverImageUrl, 'https://files.example/covers/a.webp');
  assert.equal(collection.coverImageStorageKey, 'users/7/collections/42/covers/a.webp');
});
