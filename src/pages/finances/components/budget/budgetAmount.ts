/** Match the API's nonnegative money bound without truncating or rounding input. */
export function parseBudgetAmount(input: string): number | null {
    if (!/^\d+(?:\.\d{1,2})?$/.test(input) || input.length > 32) return null;
    const [whole, fraction = ''] = input.split('.');
    const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
    if (cents > 99999999999900n) return null;
    const amount = Number(input);
    // The current API accepts a JSON number. Refuse a lossy conversion.
    if (BigInt(amount.toFixed(2).replace('.', '')) !== cents) return null;
    return amount;
}
