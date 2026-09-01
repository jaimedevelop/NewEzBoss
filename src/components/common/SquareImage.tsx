import { useState } from 'react';
import { X } from 'lucide-react';

interface SquareImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export default function SquareImage({ src, alt = 'Preview', className = '' }: SquareImageProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  return (
    <>
      <div
        className={`relative w-full aspect-square rounded-md border overflow-hidden cursor-zoom-in ${className}`}
        onClick={() => setIsPreviewOpen(true)}
      >
        <div
          className="absolute inset-0 bg-center bg-cover scale-110 blur-md"
          style={{ backgroundImage: `url(${src})` }}
        />
        <div className="absolute inset-0 bg-black/10" />
        <img src={src} alt={alt} className="relative w-full h-full object-contain" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/50 transition-colors group">
          <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Click to preview
          </span>
        </div>
      </div>

      {isPreviewOpen && (
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
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
