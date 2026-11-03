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
        const t = (now - start) / 1800;
        let target: DOMPoint | null = null;
        lines.forEach(({ path, length, forward }, index) => {
          const phase = (t - 0.12 - index * 0.22) / 0.18;
          const progress = Math.max(0, Math.min(1, phase));
          path.style.strokeDasharray = String(length);
          path.style.strokeDashoffset = String((forward ? 1 : -1) * length * (1 - progress));
          const lineMatrix = path.getScreenCTM();
          if (!lineMatrix) return;
          const pointAt = (fraction: number) => {
            const point = path.getPointAtLength(length * (forward ? fraction : 1 - fraction));
            return new DOMPoint(point.x, point.y).matrixTransform(lineMatrix);
          };
          if (phase >= 0 && phase <= 1) {
            target = pointAt(progress);
          } else if (phase > 1 && index < lines.length - 1) {
            // Keep the nib visible while it travels to the next line's start.
            const travel = (t - (0.12 + index * 0.22 + 0.18)) / 0.04;
            if (travel < 0 || travel >= 1) return;
            const next = lines[index + 1];
            const nextMatrix = next.path.getScreenCTM();
            if (!nextMatrix) return;
            const nextPoint = next.path.getPointAtLength(next.forward ? 0 : next.length);
            const from = pointAt(1);
            const to = new DOMPoint(nextPoint.x, nextPoint.y).matrixTransform(nextMatrix);
            const eased = travel * travel * (3 - 2 * travel);
            target = new DOMPoint(from.x + (to.x - from.x) * eased, from.y + (to.y - from.y) * eased);
          }
        });
        const pencilMatrix = pencil.getScreenCTM();
        const bounds = root.getBoundingClientRect();
        if (target && pencilMatrix && bounds.width && bounds.height) {
          const position = target as DOMPoint;
          const actual = tip.matrixTransform(pencilMatrix);
          pencil.style.left = `${(parseFloat(pencil.style.left) || 0) + (position.x - actual.x) * root.offsetWidth / bounds.width}px`;
          pencil.style.top = `${(parseFloat(pencil.style.top) || 0) + (position.y - actual.y) * root.offsetHeight / bounds.height}px`;
          pencil.style.opacity = '1';
        } else {
          pencil.style.opacity = '0';
        }
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
      <Pencil ref={pencilRef} className="pointer-events-none absolute block" style={{ width: '50%', height: '50%', left: 0, top: 0, opacity: 0, fill: 'none' }} />
    </span>
  );
}
