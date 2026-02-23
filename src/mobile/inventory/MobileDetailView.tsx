// src/mobile/inventory/MobileDetailView.tsx
import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── Read-only sections mode (existing) ─────────────────────────────────────

export interface DetailSection {
    title: string;
    fields: Array<{
        label: string;
        value: string | number | React.ReactNode;
        fullWidth?: boolean;
    }>;
}

// ─── Tab mode (new) ──────────────────────────────────────────────────────────

export interface DetailTab {
    id: string;
    label: string;
    content: React.ReactNode;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface MobileDetailViewProps {
    title: string;
    subtitle?: string;
    imageUrl?: string;
    badge?: { label: string; color: 'green' | 'yellow' | 'red' | 'blue' | 'orange' | 'gray' };
    loading?: boolean;
    error?: string | null;
    backPath?: string;
    headerActions?: React.ReactNode;
    // Use one or the other:
    sections?: DetailSection[];   // read-only grid display
    tabs?: DetailTab[];           // editable tab display
    defaultTab?: string;          // id of tab to open by default
}

const badgeColorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-700',
};

// ─── Loading skeleton ────────────────────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
    <div className="min-h-screen bg-gray-50 animate-pulse">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-lg" />
            <div className="h-5 bg-gray-200 rounded w-32" />
        </div>
        <div className="p-4 space-y-4">
            <div className="bg-white rounded-xl p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/4" />
                <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                            <div className="h-3 bg-gray-200 rounded w-1/2" />
                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

const MobileDetailView: React.FC<MobileDetailViewProps> = ({
    title,
    subtitle,
    imageUrl,
    badge,
    loading,
    error,
    backPath,
    headerActions,
    sections,
    tabs,
    defaultTab,
}) => {
    const navigate = useNavigate();
    const [activeTabId, setActiveTabId] = useState<string>(
        defaultTab ?? tabs?.[0]?.id ?? ''
    );

    const handleBack = () => {
        if (backPath) navigate(backPath);
        else navigate(-1);
    };

    if (loading) return <LoadingSkeleton />;

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
                    <button onClick={handleBack} className="p-1">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <span className="font-semibold text-gray-900">Error</span>
                </div>
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <p className="text-sm text-gray-500">{error}</p>
                    <button onClick={handleBack} className="mt-4 text-sm text-orange-600 font-medium">
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    const activeTab = tabs?.find(t => t.id === activeTabId);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">

            {/* ── Sticky header bar ── */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={handleBack} className="p-1 -ml-1">
                        <ArrowLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <span className="font-semibold text-gray-900 truncate max-w-[180px]">{title}</span>
                </div>
                {headerActions && (
                    <div className="flex items-center gap-2">{headerActions}</div>
                )}
            </div>

            {/* ── Hero block ── */}
            <div className="bg-white border-b border-gray-200 px-4 py-5 flex gap-4 items-start">
                <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                        <img src={imageUrl} alt={title} className="w-full h-full object-contain" />
                    ) : (
                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold text-gray-900 leading-snug">{title}</h1>
                    {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
                    {badge && (
                        <span className={`inline-block mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full ${badgeColorMap[badge.color]}`}>
                            {badge.label}
                        </span>
                    )}
                </div>
            </div>

            {/* ── Tab bar (tab mode only) ── */}
            {tabs && (
                <div className="bg-white border-b border-gray-200 sticky top-[57px] z-10">
                    <div className="flex overflow-x-auto scrollbar-none">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${activeTabId === tab.id
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-500 active:text-gray-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Content area ── */}
            <div className="flex-1 overflow-y-auto pb-10">

                {/* Tab mode: render active tab's content */}
                {tabs && activeTab && (
                    <div>{activeTab.content}</div>
                )}

                {/* Sections mode: read-only grid */}
                {sections && (
                    <div className="p-4 space-y-4">
                        {sections.map((section, si) => (
                            <div key={si} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        {section.title}
                                    </h2>
                                </div>
                                <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-4">
                                    {section.fields.map((field, fi) => (
                                        <div key={fi} className={field.fullWidth ? 'col-span-2' : ''}>
                                            <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">{field.label}</p>
                                            <div className="text-sm font-medium text-gray-900">{field.value || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileDetailView;