export function bindSidebarIconPlayback(
  link: HTMLAnchorElement,
  play: (finish: () => void) => void,
  reset: () => void,
  onActivate?: (link: HTMLAnchorElement) => ((closeDrawer: boolean) => void) | undefined,
) {
  const navigation = link.closest('nav');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let playing = false;
  let activated = false;
  let finishActivation: ((closeDrawer: boolean) => void) | undefined;

  const stop = (closeDrawer = true) => {
    playing = false;
    activated = false;
    reset();
    const finish = finishActivation;
    finishActivation = undefined;
    finish?.(closeDrawer);
  };
  const start = () => {
    if (playing || motion.matches) return;
    playing = true;
    play(() => stop());
  };
  const onEnter = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' || (event.pointerType === 'pen' && event.buttons === 0)) start();
  };
  const onLeave = () => {
    if (!activated) stop();
  };
  const isNavigationClick = (event: MouseEvent) => !event.defaultPrevented && event.button === 0 &&
    !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  const onNavigationClick = (event: MouseEvent) => {
    if (!playing || !isNavigationClick(event)) return;
    const nextLink = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (nextLink && nextLink !== link) stop(false);
  };
  const onClick = (event: MouseEvent) => {
    if (motion.matches || !isNavigationClick(event)) return;
    if (!activated) finishActivation = onActivate?.(link);
    activated = true;
    start();
  };
  const onMotionChange = () => stop();

  navigation?.addEventListener('click', onNavigationClick, true);
  link.addEventListener('pointerenter', onEnter);
  link.addEventListener('pointerleave', onLeave);
  link.addEventListener('pointercancel', onLeave);
  link.addEventListener('click', onClick);
  motion.addEventListener('change', onMotionChange);
  return () => {
    stop();
    link.removeEventListener('pointerenter', onEnter);
    link.removeEventListener('pointerleave', onLeave);
    link.removeEventListener('pointercancel', onLeave);
    link.removeEventListener('click', onClick);
    navigation?.removeEventListener('click', onNavigationClick, true);
    motion.removeEventListener('change', onMotionChange);
  };
}
