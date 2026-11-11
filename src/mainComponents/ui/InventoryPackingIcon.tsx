import { useEffect, useRef } from 'react';
import { Package } from 'lucide-react';
import { bindSidebarIconPlayback } from './sidebarIconPlayback';

// Scale the sequential storyboard to the Estimates animation runtime.
const duration = 2430;
type Point = [number, number, number];

function drawPacking(ctx: CanvasRenderingContext2D, time: number, ink: string) {
  const half = 25;
  const rim = 46.7;
  const phase = (start: number, end: number) => Math.max(0, Math.min(1, (time - start) / (end - start)));
  const ease = (p: number) => p * p * (3 - 2 * p);
  const angle = 2.39 * (ease(phase(280, 650)) - ease(phase(1480, 1800)));
  const ship = phase(1950, 2550);
  const pullback = 9 * Math.sin(Math.PI / 2 * phase(1830, 1950)) * (1 - ship);
  const x = 14 + (165 * ship * ship - pullback) * 0.2;
  const y = 30 - 3 * ship;

  function path(points: Point[], { face = false, width = 8.4, rounding = [] as number[] } = {}) {
    const projected = points.map(([px, py, z]) => [(px - py) * 0.84, (px + py) * 0.485 - z]);
    ctx.beginPath();
    if (rounding.length) {
      const [firstX, firstY] = projected[0];
      const [lastX, lastY] = projected[projected.length - 1];
      ctx.moveTo((firstX + lastX) / 2, (firstY + lastY) / 2);
      projected.forEach(([px, py], index) => {
        const [nx, ny] = projected[(index + 1) % projected.length];
        ctx.arcTo(px, py, nx, ny, rounding[index]);
      });
    } else {
      projected.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
    }
    if (face) {
      ctx.closePath();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function flap(side: number) {
    const hinge = side * half;
    const edge = hinge - side * half * Math.cos(angle);
    const rise = rim + half * Math.sin(angle);
    path([[-half, hinge, rim], [half, hinge, rim], [half, edge, rise], [-half, edge, rise]], { face: true });
  }

  ctx.clearRect(0, 0, 36, 50);
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (ship > 0 && ship < 1) {
    ctx.save();
    ctx.globalAlpha = 0.55 * Math.sin(Math.PI * ship);
    ctx.lineWidth = 0.9;
    for (const [dy, trailing] of [[-3, 0], [0, 3], [3, 0]]) {
      const end = x - 10 - trailing;
      ctx.beginPath();
      ctx.moveTo(end - 3 - ship * 7, y + dy);
      ctx.lineTo(end, y + dy);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.translate(x, y);
  ctx.scale(0.2, 0.2);
  ctx.rotate(-0.085 * ship);
  path([[-half, -half, rim], [half, -half, rim], [half, half, rim], [-half, half, rim]], { face: true, rounding: [9.25, 0, 0, 0] });
  if (angle > 0) {
    flap(-1);
    if (time > 640 && time < 1480) {
      const fall = phase(770, 1230);
      const base = 98 - 94 * fall * fall + 5 * Math.sin(Math.PI * phase(1230, 1450));
      const top = base + rim * 0.38;
      const a = 9.5;
      ctx.save();
      ctx.globalAlpha = phase(640, 770);
      ctx.translate(-8 * (1 - fall), 0);
      ctx.rotate(-0.16 * (1 - fall));
      const width = 3.2;
      path([[-a, -a, top], [a, -a, top], [a, -a, base], [a, a, base], [-a, a, base], [-a, a, top]], {
        face: true, width, rounding: [3.5, 3.5, 3.5, 3.5, 3.5, 3.5],
      });
      path([[-a, a, top], [a, a, top], [a, -a, top]], { width });
      path([[a, a, top], [a, a, base]], { width });
      path([[-a, 0, top], [a, 0, top]], { width });
      ctx.restore();
    }
  } else {
    path([[-half, 0, rim], [half, 0, rim]]);
  }
  path([[-half, half, rim], [half, half, rim], [half, -half, rim], [half, -half, 0], [half, half, 0], [-half, half, 0]], {
    face: true, rounding: [0, 0, 0, 9.25, 9.25, 9.25],
  });
  path([[half, half, rim], [half, half, 0]]);
  if (angle > 0) flap(1);
  ctx.restore();
}

export default function InventoryPackingIcon({ className = '', onActivate }: {
  className?: string;
  onActivate?: Parameters<typeof bindSidebarIconPlayback>[3];
}) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const staticRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const icon = staticRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const link = root?.closest('a');
    if (!root || !icon || !canvas || !ctx || !link) return;
    let frame = 0;

    const stop = () => {
      cancelAnimationFrame(frame);
      canvas.style.visibility = 'hidden';
      icon.style.visibility = '';
    };
    const play = (finish: () => void) => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(36 * ratio);
      canvas.height = Math.round(50 * ratio);
      ctx.setTransform(canvas.width / 36, 0, 0, canvas.height / 50, 0, 0);
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        if (elapsed >= duration) {
          finish();
          return;
        }
        if (elapsed >= 280 * duration / 2600) {
          drawPacking(ctx, elapsed * 2600 / duration, getComputedStyle(root).color);
          canvas.style.visibility = 'visible';
          icon.style.visibility = 'hidden';
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    return bindSidebarIconPlayback(link, play, stop, onActivate);
  }, [onActivate]);

  return (
    <span ref={rootRef} aria-hidden="true" className={`relative inline-flex shrink-0 ${className}`}>
      <Package ref={staticRef} className="h-full w-full" />
      <canvas ref={canvasRef} className="pointer-events-none invisible absolute" style={{ left: -4, top: -15, width: 36, height: 50 }} />
    </span>
  );
}
