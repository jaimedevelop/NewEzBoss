/** Remove a North American country code before counting local phone digits. */
export const localPhoneDigits = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (/^\s*\+1/.test(value)) {
    return digits.slice(1);
  }
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
};
