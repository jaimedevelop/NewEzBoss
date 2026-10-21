import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Match the Estimate list's customer-name popup, outside the scrolling table.
export default function CellDetails({ value, children, details, overflowOnly = false }: { value: string; children: ReactNode; details?: ReactNode; overflowOnly?: boolean }) {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const id = useId();
  const visible = pointer !== null;
  useEffect(() => {
    if (!visible) return;
    const dismiss = () => setPointer(null);
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [visible]);
  function show(element: HTMLDivElement, point: { x: number; y: number }) {
    const content = element.firstElementChild as HTMLElement | null;
    let clipped = !!content && (content.scrollWidth > content.clientWidth || content.scrollHeight > content.clientHeight);
    // Native text inputs can scroll internally without exposing their text width.
    if (content instanceof HTMLInputElement && content.type !== 'date') {
      const style = getComputedStyle(content);
      const context = document.createElement('canvas').getContext('2d');
      if (context) {
        context.font = style.font;
        const spacing = parseFloat(style.letterSpacing) || 0;
        const width = context.measureText(content.value).width + Math.max(0, content.value.length - 1) * spacing;
        clipped = width > content.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      }
    }
    setPointer(!overflowOnly || clipped ? point : null);
  }
  return <div className="min-w-0 flex-1" aria-describedby={pointer && value ? id : undefined}
    onMouseEnter={event => show(event.currentTarget, { x: event.clientX, y: event.clientY })}
    onMouseMove={event => show(event.currentTarget, { x: event.clientX, y: event.clientY })}
    onMouseLeave={() => setPointer(null)}
    onFocus={event => { const rect = event.currentTarget.getBoundingClientRect(); show(event.currentTarget, { x: rect.left, y: rect.top }); }}
    onInput={event => { const rect = event.currentTarget.getBoundingClientRect(); show(event.currentTarget, { x: rect.left, y: rect.top }); }}
    onBlur={() => setPointer(null)}>
    {children}
    {pointer && value && createPortal(<div id={id} role="tooltip"
      className="pointer-events-none fixed z-[100] w-max max-w-[min(20rem,calc(100vw-1rem))] whitespace-normal break-words rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-lg"
      style={{
        left: Math.max(8, Math.min(pointer.x, window.innerWidth - 328)),
        ...(pointer.y >= 160 ? { bottom: window.innerHeight - pointer.y + 8 } : { top: pointer.y + 16 }),
        maxHeight: pointer.y >= 160 ? pointer.y - 16 : window.innerHeight - pointer.y - 24,
        overflow: 'hidden',
      }}>{details ?? value}</div>, document.body)}
  </div>;
}
