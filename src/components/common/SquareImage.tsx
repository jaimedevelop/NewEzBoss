import { useState } from 'react';
import { X } from 'lucide-react';
import { imageSourceIdentity } from './imageSourceIdentity';

interface SquareImageProps {
  src: string;
  alt?: string;
  className?: string;
  disableLightbox?: boolean;
  hideHoverHint?: boolean;
  /** A short-lived message displayed in the same centered position as the hover hint. */
  successMessage?: string;
}

export default function SquareImage({ src, alt = 'Preview', className = '', disableLightbox = false, hideHoverHint = false, successMessage }: SquareImageProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const identity = imageSourceIdentity(src);
  const [displayed, setDisplayed] = useState({ identity, src, failed: false });
  // Keep a loaded image across grant renewals. A failed image must pick up the
  // next grant even when the underlying picture has not changed.
  if (displayed.identity !== identity || (displayed.failed && displayed.src !== src)) {
    setDisplayed({ identity, src, failed: false });
  }
  const markFailed = () => setDisplayed(current =>
    current.src === displayed.src ? { ...current, failed: true } : current
  );

  return (
    <>
      <div
        className={`relative w-full aspect-square rounded-md border overflow-hidden cursor-zoom-in ${className}`}
        onClick={() => { if (!disableLightbox) setIsPreviewOpen(true); }}
      >
        {identity === src && (
          <div
            className="absolute inset-0 bg-center bg-cover scale-110 blur-md"
            style={{ backgroundImage: `url(${displayed.src})` }}
          />
        )}
        <div className="absolute inset-0 bg-black/10" />
        {displayed.failed ? (
          <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs text-gray-600">Preview unavailable</span>
        ) : (
          <img key={displayed.src} src={displayed.src} onError={markFailed} alt={alt} className="relative w-full h-full object-contain" />
        )}
        {!hideHoverHint && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/50 transition-colors group">
            <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Click to preview
            </span>
          </div>
        )}
        {successMessage && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none" role="status" aria-live="polite">
            <span className="rounded-full bg-emerald-600/25 px-3 py-1.5 text-[0.7rem] font-medium text-white shadow-md">
              {successMessage}
            </span>
          </div>
        )}
      </div>

      {!disableLightbox && isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsPreviewOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 text-white rounded-full hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={displayed.failed ? src : displayed.src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
