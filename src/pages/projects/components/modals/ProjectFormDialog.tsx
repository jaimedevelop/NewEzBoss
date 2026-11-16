import { useId, useLayoutEffect, useRef, useState, type FormEventHandler, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { CalendarDays, ClipboardList, FolderKanban, MapPin, X } from 'lucide-react';
import { EzBossLoader } from '../../../../mainComponents/ui/EzBossLoader';
import ModalPortal from '../../../../mainComponents/ui/ModalPortal';
import './projectFormDialog.css';

interface ProjectFormDialogProps {
    title: string;
    submitLabel: string;
    canSubmit: boolean;
    isSubmitting: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: FormEventHandler<HTMLFormElement>;
    general: ReactNode;
    address: ReactNode;
    schedule: ReactNode;
    progress?: ReactNode;
}

const secondaryButton = 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
const primaryButton = 'border border-transparent bg-orange-600 text-white hover:bg-orange-700';

export function ProjectFormDialog({
    title, submitLabel, canSubmit, isSubmitting, error, onClose, onSubmit,
    general, address, schedule, progress,
}: ProjectFormDialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const id = useId();
    const [activeTab, setActiveTab] = useState(0);
    const tabs = [
        { label: 'General', icon: FolderKanban, content: general },
        { label: 'Service Address', icon: MapPin, content: address },
        { label: 'Schedule & Budget', icon: CalendarDays, content: schedule },
        ...(progress ? [{ label: 'Progress', icon: ClipboardList, content: progress }] : []),
    ];

    useLayoutEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => dialog?.close();
    }, []);

    function selectTab(index: number) {
        setActiveTab(index);
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
    }

    return (
        <ModalPortal>
            <dialog
                ref={dialogRef}
                className="project-form-dialog rounded-lg bg-white text-gray-900 shadow-xl"
                aria-labelledby={`${id}-title`}
                onCancel={(event) => {
                    event.preventDefault();
                    if (!isSubmitting) onClose();
                }}
            >
                <form
                    onSubmit={onSubmit}
                    className="project-form"
                    onInvalid={(event) => {
                        const field = event.currentTarget.querySelector(':invalid');
                        if (!field || field !== event.target) return;
                        const panel = field.closest<HTMLElement>('[data-project-tab]');
                        if (panel?.hidden) flushSync(() => selectTab(Number(panel.dataset.projectTab)));
                    }}
                >
                    <header className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:p-6">
                        <h2 id={`${id}-title`} className="text-xl font-semibold text-gray-900">{title}</h2>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            aria-label="Close project form"
                            className="shrink-0 rounded-lg p-2 transition-colors hover:bg-gray-100 disabled:opacity-50"
                        >
                            <X size={20} aria-hidden="true" />
                        </button>
                    </header>
                    <div role="tablist" aria-label="Project form sections" className="flex overflow-x-auto gap-4 border-b border-gray-200 px-4 sm:gap-8 sm:px-6">
                        {tabs.map(({ label, icon: Icon }, index) => (
                            <button
                                key={label}
                                ref={(button) => { tabRefs.current[index] = button; }}
                                id={`${id}-tab-${index}`}
                                aria-controls={`${id}-panel-${index}`}
                                aria-selected={activeTab === index}
                                tabIndex={activeTab === index ? 0 : -1}
                                role="tab"
                                type="button"
                                onClick={() => selectTab(index)}
                                onKeyDown={(event) => {
                                    const destinations: Record<string, number> = {
                                        ArrowLeft: (index + tabs.length - 1) % tabs.length,
                                        ArrowRight: (index + 1) % tabs.length,
                                        Home: 0,
                                        End: tabs.length - 1,
                                    };
                                    const next = destinations[event.key];
                                    if (next === undefined) return;
                                    event.preventDefault();
                                    selectTab(next);
                                    tabRefs.current[next]?.focus();
                                }}
                                className={`flex shrink-0 items-center gap-2 border-b-2 px-1 py-4 text-sm font-medium transition-colors ${activeTab === index
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                            >
                                <Icon size={16} aria-hidden="true" />
                                {label}
                            </button>
                        ))}
                    </div>
                    <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                        {tabs.map(({ label, content }, index) => (
                            <div
                                key={label}
                                role="tabpanel"
                                id={`${id}-panel-${index}`}
                                aria-labelledby={`${id}-tab-${index}`}
                                data-project-tab={index}
                                hidden={activeTab !== index}
                            >
                                {content}
                            </div>
                        ))}
                    </div>
                    <footer className="flex flex-wrap items-center justify-end gap-3 border-t bg-gray-50 px-4 py-4 sm:px-6">
                        {error && <p role="alert" className="w-full text-sm text-red-700">{error}</p>}
                        <button type="button" onClick={onClose} disabled={isSubmitting} className={`project-form-action ${secondaryButton}`}>
                            Cancel
                        </button>
                        <button type="submit" disabled={!canSubmit || isSubmitting} className={`project-form-action ${primaryButton}`}>
                            {isSubmitting && <EzBossLoader size={16} />}
                            {submitLabel}
                        </button>
                    </footer>
                </form>
            </dialog>
        </ModalPortal>
    );
}
