export function bindSidebarIconPlayback(
  link: HTMLAnchorElement,
  play: (finish: () => void) => void,
  reset: () => void,
  onActivate?: (link: HTMLAnchorElement) => (() => void) | undefined,
) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let playing = false;
  let activated = false;
  let finishActivation: (() => void) | undefined;

  const stop = () => {
    playing = false;
    activated = false;
    reset();
    const finish = finishActivation;
    finishActivation = undefined;
    finish?.();
  };
  const start = () => {
    if (playing || motion.matches) return;
    playing = true;
    play(stop);
  };
  const onEnter = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' || (event.pointerType === 'pen' && event.buttons === 0)) start();
  };
  const onLeave = () => {
    if (!activated) stop();
  };
  const onClick = (event: MouseEvent) => {
    if (motion.matches || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!activated) finishActivation = onActivate?.(link);
    activated = true;
    start();
  };

  link.addEventListener('pointerenter', onEnter);
  link.addEventListener('pointerleave', onLeave);
  link.addEventListener('pointercancel', onLeave);
  link.addEventListener('click', onClick);
  motion.addEventListener('change', stop);
  return () => {
    stop();
    link.removeEventListener('pointerenter', onEnter);
    link.removeEventListener('pointerleave', onLeave);
    link.removeEventListener('pointercancel', onLeave);
    link.removeEventListener('click', onClick);
    motion.removeEventListener('change', stop);
  };
}
