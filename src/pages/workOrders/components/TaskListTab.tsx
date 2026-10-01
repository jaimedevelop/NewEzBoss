// src/pages/workOrders/components/TaskListTab.tsx

import React, { useEffect, useRef, useState } from 'react';
import { ListTodo, CheckCircle2, Circle, ChevronDown, ChevronRight, Plus, X, StickyNote } from 'lucide-react';
import { WorkOrderTask } from '../../../services/workOrders/workOrders.types';
import PictureUploadGrid, { PictureItem } from '../../../components/common/PictureUploadGrid';

const NOTE_MAX_LENGTH = 256;

interface TaskListTabProps {
    tasks: WorkOrderTask[];
    onToggleTask: (taskId: string, currentStatus: boolean) => void;
    onUploadTaskMedia: (taskId: string, file: File) => void;
    onRemoveTaskMedia: (mediaId: string) => void;
    onUpdateTaskMediaDescription: (mediaId: string, description: string) => void;
    onUpdateTaskNote: (taskId: string, note: string) => void;
    uploadingTaskId?: string | null;
    selectedTaskId?: string;
}

const TaskListTab: React.FC<TaskListTabProps> = ({
    tasks,
    onToggleTask,
    onUploadTaskMedia,
    onRemoveTaskMedia,
    onUpdateTaskMediaDescription,
    onUpdateTaskNote,
    uploadingTaskId,
    selectedTaskId
}) => {
    const [editingNoteTaskId, setEditingNoteTaskId] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState('');
    // Groups begin open to retain the existing task-list overview. Steps start compact.
    // Keys are backend IDs, so these choices survive task refreshes and tab switches.
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set());
    const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set());
    const taskRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const selectedTaskExists = Boolean(selectedTaskId && tasks.some(task => task.id === selectedTaskId));

    useEffect(() => {
        if (!selectedTaskId || !selectedTaskExists) return;
        const selectedTask = tasks.find(task => task.id === selectedTaskId);
        if (!selectedTask) return;

        const groupId = selectedTask.laborItemId || 'other';
        setCollapsedGroupIds(current => {
            if (!current.has(groupId)) return current;
            const next = new Set(current);
            next.delete(groupId);
            return next;
        });
        setExpandedTaskIds(current => {
            if (current.has(selectedTaskId)) return current;
            return new Set(current).add(selectedTaskId);
        });

        const timer = window.setTimeout(() => {
            taskRefs.current[selectedTaskId]?.focus({ preventScroll: true });
            taskRefs.current[selectedTaskId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 0);
        return () => window.clearTimeout(timer);
    }, [selectedTaskId, selectedTaskExists, tasks]);

    const toggleGroup = (groupId: string) => {
        setCollapsedGroupIds(current => {
            const next = new Set(current);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const toggleStep = (taskId: string) => {
        setExpandedTaskIds(current => {
            const next = new Set(current);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const openNoteModal = (task: WorkOrderTask) => {
        setEditingNoteTaskId(task.id);
        setNoteDraft(task.notes ?? '');
    };

    const closeNoteModal = () => {
        setEditingNoteTaskId(null);
        setNoteDraft('');
    };

    const saveNote = () => {
        if (!editingNoteTaskId) return;
        onUpdateTaskNote(editingNoteTaskId, noteDraft.trim().slice(0, NOTE_MAX_LENGTH));
        closeNoteModal();
    };

    const groupedTasks = tasks.reduce((acc, task) => {
        const key = task.laborItemId || 'other';
        if (!acc[key]) {
            acc[key] = {
                id: key,
                name: task.laborItemName || 'General Tasks',
                tasks: []
            };
        }
        acc[key].tasks.push(task);
        return acc;
    }, {} as Record<string, { id: string, name: string, tasks: WorkOrderTask[] }>);

    const groupList = Object.values(groupedTasks);

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Labor Task List</h3>
                <div className="text-sm font-medium text-gray-600">
                    {tasks.filter(t => t.isCompleted).length} of {tasks.length} tasks completed
                </div>
            </div>
            {selectedTaskId && !selectedTaskExists && <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">The requested task is no longer available on this work order.</div>}

            <div className="space-y-8">
                {groupList.map((group) => {
                    const isGroupComplete = group.tasks.every(t => t.isCompleted);
                    const isGroupCollapsed = collapsedGroupIds.has(group.id);
                    const stepLabel = group.tasks.length === 1 ? 'step' : 'steps';

                    return (
                        <div key={group.id} className="space-y-4">
                            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.id)}
                                    aria-expanded={!isGroupCollapsed}
                                    aria-controls={`task-group-${group.id}`}
                                    className="-ml-1 flex min-w-0 items-center gap-1 rounded px-1 py-1 text-left focus:outline-none focus:ring-2 focus:ring-orange-500"
                                >
                                    {isGroupCollapsed ? <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />}
                                    <h4 className="truncate font-bold text-gray-800 text-sm uppercase tracking-wider">
                                        {group.name} ({group.tasks.length} {stepLabel})
                                    </h4>
                                </button>
                                {isGroupComplete && group.tasks.length > 0 && (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-label="All steps completed" />
                                )}
                            </div>

                            <div id={`task-group-${group.id}`} hidden={isGroupCollapsed} className="space-y-3">
                                {group.tasks.map((task) => {
                                    const hasReachedImageLimit = (task.media?.length ?? 0) >= 5;
                                    const uploadIsDisabled = Boolean(uploadingTaskId) || hasReachedImageLimit;
                                    const hasNote = Boolean(task.notes && task.notes.trim().length > 0);
                                    const isStepExpanded = expandedTaskIds.has(task.id);

                                    return (
                                    <div
                                        key={task.id}
                                        ref={(element) => { taskRefs.current[task.id] = element; }}
                                        tabIndex={selectedTaskId === task.id ? -1 : undefined}
                                        className={`rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${task.isCompleted
                                            ? 'bg-green-50 border-green-100'
                                            : 'bg-white border-gray-200'
                                            } ${selectedTaskId === task.id ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}
                                    >
                                        <div className="flex items-center gap-3 p-3 sm:p-4">
                                            <button
                                                type="button"
                                                onClick={() => onToggleTask(task.id, task.isCompleted)}
                                                aria-label={task.isCompleted ? `Mark ${task.name} incomplete` : `Mark ${task.name} complete`}
                                                className={`mt-1 transition-colors ${task.isCompleted ? 'text-green-600' : 'text-gray-300 hover:text-gray-400'}`}
                                            >
                                                {task.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => toggleStep(task.id)}
                                                aria-expanded={isStepExpanded}
                                                aria-controls={`task-step-${task.id}`}
                                                className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded text-left focus:outline-none focus:ring-2 focus:ring-orange-500"
                                            >
                                                <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                                                    <span className={`truncate font-semibold ${task.isCompleted ? 'text-green-900 line-through opacity-75' : 'text-gray-900'}`}>{task.name}</span>
                                                    {task.completedAt && (
                                                        <p className="text-xs font-medium text-green-700">
                                                            Completed {new Date(task.completedAt).toLocaleString()}
                                                        </p>
                                                    )}
                                                </span>
                                                {isStepExpanded ? <ChevronDown className="h-5 w-5 shrink-0 text-gray-500" /> : <ChevronRight className="h-5 w-5 shrink-0 text-gray-500" />}
                                            </button>
                                        </div>

                                        <div id={`task-step-${task.id}`} hidden={!isStepExpanded} className="border-t border-inherit px-3 pb-3 pt-3 sm:px-4 sm:pb-4">
                                            <p className="text-sm text-gray-600">{task.description}</p>
                                            <div className="mt-3 flex flex-wrap items-start gap-4">
                                                <div className="max-w-[36rem]">
                                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                                        <label
                                                            aria-disabled={uploadIsDisabled}
                                                            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm text-white transition-colors ${uploadIsDisabled
                                                                ? 'cursor-not-allowed bg-gray-300 opacity-75'
                                                                : 'cursor-pointer bg-orange-600 hover:bg-orange-700'
                                                                }`}
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                            {hasReachedImageLimit ? '5/5 images uploaded' : 'Add Pictures'}
                                                            <input
                                                                className="sr-only"
                                                                type="file"
                                                                accept="image/jpeg,image/png,image/gif,image/webp"
                                                                capture="environment"
                                                                disabled={uploadIsDisabled}
                                                                onChange={(event) => {
                                                                    const file = event.target.files?.[0];
                                                                    if (file) onUploadTaskMedia(task.id, file);
                                                                    event.currentTarget.value = '';
                                                                }}
                                                            />
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => openNoteModal(task)}
                                                            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-orange-700 border border-orange-200 bg-white hover:bg-orange-50 transition-colors"
                                                        >
                                                            <StickyNote className="w-4 h-4" />
                                                            {hasNote ? 'Edit Note' : 'Add Note'}
                                                        </button>
                                                    </div>
                                                    <PictureUploadGrid
                                                        pictures={(task.media ?? []).map((media): PictureItem => ({
                                                            id: media.id,
                                                            file: null,
                                                            url: media.url,
                                                            description: media.description ?? ''
                                                        }))}
                                                        isEditing={!uploadingTaskId}
                                                        maxPictures={5}
                                                        showTitle={false}
                                                        showEmptyState={false}
                                                        addButtonLabel="Add Pictures"
                                                        showAddButton={false}
                                                        onAdd={(file) => onUploadTaskMedia(task.id, file)}
                                                        onRemove={onRemoveTaskMedia}
                                                        onUpdateDescription={onUpdateTaskMediaDescription}
                                                    />
                                                </div>
                                                {hasNote && (
                                                    <div className="min-w-0 flex-1 text-left sm:min-w-64">
                                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Note</p>
                                                        <p className="line-clamp-4 break-words whitespace-pre-wrap text-sm text-gray-700">{task.notes}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {tasks.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No labor tasks defined for this work order.</p>
                    </div>
                )}
            </div>

            {editingNoteTaskId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                            <h3 className="text-base font-bold text-gray-900">Task Note</h3>
                            <button onClick={closeNoteModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            <textarea
                                autoFocus
                                value={noteDraft}
                                onChange={(event) => setNoteDraft(event.target.value.slice(0, NOTE_MAX_LENGTH))}
                                maxLength={NOTE_MAX_LENGTH}
                                rows={5}
                                placeholder="Add a note for this task..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <p className="mt-1 text-right text-xs text-gray-400">{noteDraft.length} / {NOTE_MAX_LENGTH}</p>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
                            <button
                                onClick={closeNoteModal}
                                className="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveNote}
                                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                            >
                                Save Note
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskListTab;
