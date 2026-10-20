/** Remove a North American country code before counting local phone digits. */
export const localPhoneDigits = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (/^\s*\+1/.test(value)) {
    return digits.slice(1);
  }
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
};

/** Format local signup numbers as (111)-111-1111 as digits are entered. */
export const formatPhoneNumber = (value: string): string => {
  const digits = localPhoneDigits(value).slice(0, 10);
  if (digits.length <= 3) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
  return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
};
