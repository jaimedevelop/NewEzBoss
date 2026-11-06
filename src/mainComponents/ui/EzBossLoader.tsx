import React, { useLayoutEffect, useRef, useState } from 'react';
import './ezboss-loader.css';

const bounds = [[60,160],[160,255],[255,372],[372,489],[489,587],[587,687]];
export function EzBossMark({ reveal = false }: { reveal?: boolean }) {
  return <span className={`ezboss-mark ${reveal ? 'ezboss-mark--reveal' : ''}`} aria-hidden="true">
    {reveal ? bounds.map(([left,right], index) => <span key={index} className="ezboss-letter" style={{ clipPath: `inset(20% ${(741-right)/741*100}% 20% ${left/741*100}%)`, animationDelay: `${index * .173}s` }}><img src="/ezboss-loading.png" alt="" /></span>) : <img className="ezboss-word" src="/ezboss-loading.png" alt="" />}
    <svg className="ezboss-frame" viewBox="0 0 741 221"><g fill="none" stroke="currentColor" strokeWidth="4">{[3,12].map(inset => <rect key={inset} x={inset} y={inset} width={741-inset*2} height={221-inset*2} pathLength="100" />)}</g></svg>
  </span>;
}
export function EzBossLoader({ className = '', size, style, label = 'Loading…', variant = 'skeleton', ...rest }: Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> & { size?: number | string; label?: string; strokeWidth?: number; variant?: 'skeleton' | 'brand' }) {
  const compact = Number(size) <= 20 || /(?:^|\s)(?:w|h)-[345](?:\s|$)|(?:w|h)-3\.5/.test(className);
  const presentation = className.replace(/(?:^|\s)(?:(?:w|h)-[\d.]+|animate-spin|rounded-full|border-\S+)/g, ' ');
  const attributes = { ...rest };
  delete attributes.strokeWidth;
  if (!compact && variant === 'skeleton') return <span {...attributes} role="status" aria-label={label} className={`ezboss-skeleton ${presentation}`} style={style}>
    <span className="ezboss-skeleton-heading" aria-hidden="true" />
    {Array.from({ length: 4 }, (_, row) => <span className="ezboss-skeleton-row" key={row} aria-hidden="true"><span /><span /><span /></span>)}
  </span>;
  return <span {...attributes} role="status" aria-label={label} className={`ezboss-loader ${compact ? 'ezboss-loader--compact' : ''} ${presentation}`} style={style}><EzBossMark /></span>;
}
export function EzBossLoadingProvider({ children, ready = false, pending = false }: { children: React.ReactNode; ready?: boolean; pending?: boolean }) {
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [revealing, setRevealing] = useState(() => ready && !reducedMotion());
  const [dismissing, setDismissing] = useState(false);
  const completed = useRef(false);
  useLayoutEffect(() => {
    if (!ready) { setRevealing(false); setDismissing(false); return; }
    if (completed.current) return;
    if (reducedMotion()) { completed.current = true; return; }
    setRevealing(true);
    setDismissing(false);
    let timer = setTimeout(() => {
      setDismissing(true);
      timer = setTimeout(() => {
        completed.current = true;
        setRevealing(false);
        setDismissing(false);
      }, 320);
    }, 1420);
    return () => clearTimeout(timer);
  }, [ready]);
  const covering = revealing || (pending && !completed.current);
  return <><div {...(covering ? { inert: '' } : {})} aria-hidden={covering || undefined}>{children}</div>{covering && <div className={`ezboss-page-reveal ${dismissing ? 'ezboss-page-reveal--leaving' : ''}`} role="status" aria-label={revealing ? "Workspace ready" : "Loading workspace"}><EzBossMark reveal={revealing} /></div>}</>;
}
