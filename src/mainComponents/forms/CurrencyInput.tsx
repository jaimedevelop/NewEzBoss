import React, { forwardRef, useState } from 'react';

export const formatDollarAmount = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Keeps the controlled value numeric while formatting dollars outside editing. */
export const CurrencyInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function CurrencyInput({ value, onChange, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  const raw = String(value ?? '');
  const displayed = !focused && raw !== '' && Number.isFinite(Number(raw)) ? formatDollarAmount(Number(raw)) : raw;
  return <input {...props} ref={ref} type="text" inputMode="decimal" value={displayed}
    onFocus={event => { setFocused(true); onFocus?.(event); }}
    onBlur={event => { setFocused(false); onBlur?.(event); }}
    onChange={event => {
      const next = event.target.value.replace(/[$,]/g, '');
      if (!/^\d*\.?\d{0,2}$/.test(next)) return;
      event.target.value = next;
      onChange?.(event);
    }} />;
});
