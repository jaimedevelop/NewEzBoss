import { useEffect, useRef } from 'react';
import { FileText, Pencil } from 'lucide-react';

/** A centered Lucide document; its overlay never changes the navigation layout. */
export default function EstimateWritingIcon({ className = '' }: { className?: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const documentRef = useRef<SVGSVGElement>(null);
  const pencilRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const document = documentRef.current;
    const pencil = pencilRef.current;
    const link = root?.closest('a');
    if (!root || !document || !pencil || !link) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const lines = Array.from(document.querySelectorAll<SVGPathElement>('path'))
      .filter(path => { const box = path.getBBox(); return box.width > 0 && box.height < 0.1; })
      .sort((a, b) => a.getBBox().y - b.getBBox().y)
      .map(path => {
        const length = path.getTotalLength();
        return { path, length, forward: path.getPointAtLength(0).x < path.getPointAtLength(length).x };
      });

    // Find the visible southwest nib, including the rounded stroke, rather than
    // guessing its position within the icon's viewBox.
    let tip = new DOMPoint();
    let best = -Infinity;
    pencil.querySelectorAll<SVGPathElement>('path').forEach(path => {
      const length = path.getTotalLength();
      for (let i = 0; i <= 1200; i++) {
        const point = path.getPointAtLength(length * i / 1200);
        if (point.y - point.x > best) {
          best = point.y - point.x;
          tip = new DOMPoint(point.x, point.y);
        }
      }
    });
    const radius = parseFloat(getComputedStyle(pencil).strokeWidth) / 2 / Math.sqrt(2);
    tip.x -= radius;
    tip.y += radius;
    let frame = 0;

    const reset = () => {
      pencil.style.opacity = '0';
      lines.forEach(({ path }) => {
        path.style.removeProperty('stroke-dasharray');
        path.style.removeProperty('stroke-dashoffset');
      });
    };
    const stop = () => { cancelAnimationFrame(frame); reset(); };
    const play = () => {
      stop();
      if (motion.matches) return;
      const start = performance.now();
      const tick = (now: number) => {
        const t = (now - start) / 900;
        let writing = false;
        lines.forEach(({ path, length, forward }, index) => {
          const phase = (t - 0.12 - index * 0.22) / 0.18;
          const progress = Math.max(0, Math.min(1, phase));
          path.style.strokeDasharray = String(length);
          path.style.strokeDashoffset = String((forward ? 1 : -1) * length * (1 - progress));
          if (phase < 0 || phase > 1) return;
          const point = path.getPointAtLength(length * (forward ? progress : 1 - progress));
          const lineMatrix = path.getScreenCTM();
          const pencilMatrix = pencil.getScreenCTM();
          if (!lineMatrix || !pencilMatrix) return;
          const target = new DOMPoint(point.x, point.y).matrixTransform(lineMatrix);
          const actual = tip.matrixTransform(pencilMatrix);
          const bounds = root.getBoundingClientRect();
          if (!bounds.width || !bounds.height) return;
          pencil.style.left = `${(parseFloat(pencil.style.left) || 0) + (target.x - actual.x) * root.offsetWidth / bounds.width}px`;
          pencil.style.top = `${(parseFloat(pencil.style.top) || 0) + (target.y - actual.y) * root.offsetHeight / bounds.height}px`;
          writing = true;
        });
        pencil.style.opacity = writing ? '1' : '0';
        if (t < 1.35) frame = requestAnimationFrame(tick);
        else reset();
      };
      frame = requestAnimationFrame(tick);
    };

    link.addEventListener('pointerenter', play);
    link.addEventListener('focus', play);
    link.addEventListener('click', play);
    motion.addEventListener('change', stop);
    return () => {
      stop();
      link.removeEventListener('pointerenter', play);
      link.removeEventListener('focus', play);
      link.removeEventListener('click', play);
      motion.removeEventListener('change', stop);
    };
  }, []);

  return (
    <span ref={rootRef} aria-hidden="true" className={`relative inline-flex shrink-0 self-center items-center justify-center leading-none ${className}`}>
      <FileText ref={documentRef} className="block h-full w-full" strokeWidth={1.8} />
      <Pencil ref={pencilRef} className="pointer-events-none absolute block text-blue-400" style={{ width: '50%', height: '50%', left: 0, top: 0, opacity: 0, fill: '#0f172a' }} />
    </span>
  );
}
