// src/pages/workOrders/components/MaterialReadinessTab.tsx

import React from 'react';
import { Package, Hammer, HardHat, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { WorkOrderChecklistItem } from '../../../services/workOrders/workOrders.types';

interface MaterialReadinessTabProps {
    checklist: WorkOrderChecklistItem[];
    onToggleReady: (itemId: string, currentStatus: boolean) => void;
}

const MaterialReadinessTab: React.FC<MaterialReadinessTabProps> = ({ checklist, onToggleReady }) => {
    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'product': return <Package className="w-5 h-5" />;
            case 'tool': return <Hammer className="w-5 h-5" />;
            case 'equipment': return <HardHat className="w-5 h-5" />;
            default: return <Package className="w-5 h-5" />;
        }
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Material Readiness Checklist</h3>
                <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ready ({checklist.filter(i => i.isReady).length})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-red-700">
                        <XCircle className="w-4 h-4" />
                        <span>Pending ({checklist.filter(i => !i.isReady).length})</span>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {checklist.map((item) => (
                    <div
                        key={item.id}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all ${item.isReady
                            ? 'bg-green-50 border-green-100 shadow-sm'
                            : 'bg-white border-gray-200'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${item.isReady ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                {getTypeIcon(item.type)}
                            </div>
                            <div>
                                <p className={`font-semibold ${item.isReady ? 'text-green-900' : 'text-gray-900'}`}>
                                    {item.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-sm text-gray-500">Qty: {item.quantity}</span>
                                    {item.poId && (
                                        <>
                                            <span className="text-gray-300">•</span>
                                            <button
                                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                                                onClick={() => {/* TODO: Navigate to PO */ }}
                                            >
                                                PO Link <ExternalLink className="w-3 h-3" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => onToggleReady(item.id, item.isReady)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${item.isReady
                                ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {item.isReady ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Ready
                                </>
                            ) : (
                                'Mark Ready'
                            )}
                        </button>
                    </div>
                ))}

                {checklist.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No materials or tools added to this work order.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MaterialReadinessTab;
