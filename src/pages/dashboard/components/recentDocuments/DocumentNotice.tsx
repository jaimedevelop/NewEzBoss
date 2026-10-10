import { useId, useState, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export default function DocumentNotice({ title, messages }: { title: string; messages: ReactNode[] }) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = hovered || focused;

  if (messages.length === 0) return null;

  return <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={event => { if (event.target.matches(':focus-visible')) setFocused(true); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onKeyDown={event => {
      if (event.key === 'Escape') {
        setHovered(false);
        setFocused(false);
      }
    }}>
    <button type="button" aria-label={`${title} notices`} aria-expanded={open} aria-controls={open ? id : undefined}
      className="flex h-7 w-7 items-center justify-center rounded-full text-orange-600 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
      <AlertCircle size={18} aria-hidden="true" />
    </button>
    {open && <div className="absolute left-1/2 top-full z-30 w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 pt-2">
      <div id={id} role="region" aria-label={`${title} notices`} className="relative space-y-2 rounded-lg border border-orange-200 bg-white p-4 text-sm font-normal text-gray-700 shadow-lg">
        {messages.map((message, index) => <p key={index}>{message}</p>)}
      </div>
    </div>}
  </div>;
}
