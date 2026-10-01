// src/pages/workOrders/components/MediaTab.tsx

import React, { useRef } from 'react';
import { ImageIcon, FileText, Upload, Trash2 } from 'lucide-react';
import { WorkOrderMedia } from '../../../services/workOrders/workOrders.types';

interface MediaTabProps {
    media: WorkOrderMedia[];
    onUpload: (type: 'image' | 'document', file: File) => void;
    uploading?: boolean;
    onDelete: (mediaId: string) => void;
}

const MediaTab: React.FC<MediaTabProps> = ({ media, onUpload, onDelete, uploading = false }) => {
    const imageInput = useRef<HTMLInputElement>(null);
    const documentInput = useRef<HTMLInputElement>(null);
    const generalMedia = media.filter(m => !m.taskId);
    const taskMedia = media.filter(m => m.taskId);

    const MediaGrid = ({ items, title }: { items: WorkOrderMedia[], title: string }) => (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                {title.includes('General') && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => imageInput.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 transition-all disabled:cursor-wait disabled:opacity-60"
                        >
                            <ImageIcon className="w-4 h-4" />
                            Add Photo
                        </button>
                        <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) onUpload('image', file); event.target.value = ''; }} />
                        <button
                            onClick={() => documentInput.current?.click()}
                            disabled={uploading}
                            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all disabled:cursor-wait disabled:opacity-60"
                        >
                            <FileText className="w-4 h-4" />
                            Add Doc
                        </button>
                        <input ref={documentInput} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) onUpload('document', file); event.target.value = ''; }} />
                    </div>
                )}
            </div>

            {items.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">{uploading ? 'Uploading file…' : `No ${title.toLowerCase()} uploaded yet.`}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {items.map((item) => (
                        <div key={item.id} className="group relative aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 shadow-sm transition-all hover:shadow-md">
                            {item.type === 'image' ? (
                                <img src={item.url} alt={item.fileName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                    <FileText className="w-10 h-10 text-blue-500 mb-2" />
                                    <span className="text-xs text-gray-600 text-center line-clamp-2">{item.fileName}</span>
                                </div>
                            )}

                            <p className="absolute bottom-1 left-1 right-1 rounded bg-white/85 px-1 text-[10px] text-gray-600">{new Date(item.uploadedAt).toLocaleDateString()}</p>

                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <button
                                    onClick={() => onDelete(item.id)}
                                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg transform scale-90 group-hover:scale-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="p-6">
            <MediaGrid items={generalMedia} title="General Job Photos & Docs" />
            <MediaGrid items={taskMedia} title="Task-Specific Documentation" />
        </div>
    );
};

export default MediaTab;
