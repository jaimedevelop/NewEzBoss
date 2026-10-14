import { useState } from 'react';
import { Plus } from 'lucide-react';

export function AddLineItemsControl({ onAdd }: { onAdd: (count: number) => void }) {
  const [quantity, setQuantity] = useState('');
  const count = quantity === '' ? 1 : Number(quantity);
  const valid = Number.isSafeInteger(count) && count > 0;

  const add = () => {
    if (valid) onAdd(count);
  };

  return (
    <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors focus-within:border-orange-500 hover:border-orange-500">
      <button
        type="button"
        onClick={add}
        disabled={!valid}
        aria-label="Add line items"
        className="flex items-center gap-2 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Add
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="1"
        aria-label="Number of line items to add"
        value={quantity}
        onChange={(event) => {
          const value = event.target.value;
          if (/^\d*$/.test(value)) setQuantity(value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            add();
          }
        }}
        className="w-16 rounded border border-gray-300 bg-white px-2 py-1 text-center text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
      <button
        type="button"
        onClick={add}
        disabled={!valid}
        className="flex items-center gap-2 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Line Item(s)
      </button>
    </div>
  );
}
