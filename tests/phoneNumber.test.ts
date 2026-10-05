import assert from 'node:assert/strict';
import test from 'node:test';
import { localPhoneDigits } from '../src/utils/phoneNumber.ts';

test('country codes are removed before the ten-digit limit, preserving the last digit', () => {
  for (const value of ['+1 (212) 555-7896', '+12125557896', '1-212-555-7896', '12125557896', '(212)-555-7896', '2125557896']) {
    assert.equal(localPhoneDigits(value).slice(0, 10), '2125557896', value);
  }
});

test('partial input and a local leading 1 do not lose digits', () => {
  assert.equal(localPhoneDigits(''), '');
  assert.equal(localPhoneDigits('+1'), '');
  assert.equal(localPhoneDigits('+1 (212)'), '212');
  assert.equal(localPhoneDigits('1234567890'), '1234567890');
  assert.equal(localPhoneDigits('21255578967').slice(0, 10), '2125557896');
});

test('normalization is stable when an imported number is edited again', () => {
  const normalized = localPhoneDigits('+1 (212) 555-7896');
  assert.equal(localPhoneDigits(normalized), normalized);
  assert.equal(localPhoneDigits('(212)-555-789'), '212555789');
});
