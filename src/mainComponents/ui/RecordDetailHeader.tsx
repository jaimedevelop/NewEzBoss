import type { ReactNode } from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';

interface RecordDetailHeaderProps {
  title: string;
  icon: LucideIcon;
  backTitle: string;
  onBack: () => void;
  children?: ReactNode;
  actions?: ReactNode;
}

export const recordHeaderActionClass =
  'inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60';

export const recordHeaderDeleteClass =
  'inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60';

export function RecordDetailHeader({ title, icon: Icon, backTitle, onBack, children, actions }: RecordDetailHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200 px-3 py-4 sm:px-6 sm:py-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onBack}
            className="mt-1 shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            title={backTitle}
            aria-label={backTitle}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <Icon className="w-6 h-6 shrink-0 text-orange-600" aria-hidden="true" />
              <h1 className="min-w-0 text-xl sm:text-2xl font-semibold text-gray-900 break-words">{title}</h1>
            </div>
            {children}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
