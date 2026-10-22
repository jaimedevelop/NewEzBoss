import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const options = [
  { value: 'all', label: 'All Client States', color: 'bg-white text-gray-900 border-gray-300' },
  { value: 'invoiced', label: 'Invoiced', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'sent', label: 'Sent', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'viewed', label: 'Viewed', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'accepted', label: 'Accepted', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'denied', label: 'Denied', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'on-hold', label: 'On Hold', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'expired', label: 'Expired', color: 'bg-orange-100 text-orange-800 border-orange-300' },
];

export function ClientStateFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    containerRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    return () => document.removeEventListener('mousedown', dismiss);
  }, [open]);

  return (
    <div ref={containerRef} className="relative" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }} onKeyDown={event => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (!open) { setOpen(true); return; }
        const buttons = Array.from(containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') ?? []);
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    }}>
      <button ref={triggerRef} type="button" aria-label={`Client States: ${selected.label}`}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className={`flex w-full items-center justify-between gap-2 rounded-md border py-2 pl-3 pr-3 text-sm font-medium leading-5 focus:outline-none focus:ring-2 focus:ring-orange-500 ${selected.color}`}>
        <span>{selected.label}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
      </button>
      {open && <div role="menu" aria-label="Client States"
        // Keep focus inside until click commits the selection. Safari can blur
        // the focused option before clicking another button, closing the menu.
        onMouseDown={event => event.preventDefault()}
        className="absolute left-0 right-0 z-30 mt-1 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
        {options.map(option => <button key={option.value} type="button" role="menuitemradio"
          aria-checked={value === option.value} onClick={() => {
            onChange(option.value);
            setOpen(false);
            triggerRef.current?.focus();
          }}
          className={`mb-1 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium last:mb-0 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-orange-500 ${option.color}`}>
          {option.label}
          {value === option.value && <Check aria-hidden="true" className="h-4 w-4 shrink-0" />}
        </button>)}
      </div>}
    </div>
  );
}
