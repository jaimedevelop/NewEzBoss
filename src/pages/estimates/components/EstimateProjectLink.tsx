import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import type { EstimateWithId } from '../../../services/estimates';

interface EstimateProjectLinkProps {
  projectId: string;
  project?: EstimateWithId['linkedProject'];
  className: string;
}

export function EstimateProjectLink({ projectId, project, className }: EstimateProjectLinkProps) {
  const tooltipId = useId();
  const anchor = useRef<HTMLAnchorElement>(null);
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [position, setPosition] = useState<{ left: number; bottom: number }>();
  const projectLabel = [project?.name?.trim(), project?.number?.trim()].filter(Boolean).join(' / ');
  const tooltip = projectLabel ? `Project ${projectLabel}` : 'Project';
  const visible = hovering || focused;

  useEffect(() => {
    if (!visible) return;
    const updatePosition = () => {
      const bounds = anchor.current?.getBoundingClientRect();
      if (bounds) {
        const maxWidth = Math.min(256, window.innerWidth - 16);
        setPosition({
          left: Math.max(8, Math.min(bounds.left, window.innerWidth - maxWidth - 8)),
          bottom: window.innerHeight - bounds.top + 4,
        });
      }
    };
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [visible]);

  return (
    <>
      <Link
        ref={anchor}
        to={`/projects/${encodeURIComponent(projectId)}`}
        aria-label="Open linked project"
        aria-describedby={tooltipId}
        onPointerEnter={event => { if (event.pointerType !== 'touch') setHovering(true); }}
        onPointerLeave={() => setHovering(false)}
        onFocus={event => setFocused(event.currentTarget.matches(':focus-visible'))}
        onBlur={() => setFocused(false)}
        onClick={event => event.stopPropagation()}
        className={`text-white ${className}`}
      >
        <FolderOpen className="relative h-4 w-4" aria-hidden="true" />
        <span id={tooltipId} hidden>{tooltip}</span>
      </Link>
      {visible && position && createPortal(
        <span
          role="tooltip"
          aria-hidden="true"
          style={position}
          className="pointer-events-none fixed z-[100] w-max max-w-[min(16rem,calc(100vw-1rem))] break-words rounded bg-gray-900 px-2 py-1 text-xs font-medium leading-snug text-white shadow"
        >
          {tooltip}
        </span>,
        document.body,
      )}
    </>
  );
}
