import React, { useState } from 'react';
import { Eye, EyeOff, Package, Briefcase, Wrench, Truck, HelpCircle, Save, Loader2, Search } from 'lucide-react';
import type { Estimate, EstimateGroup, ClientViewSettings } from '../../../../../../services/estimates/estimates.types';
import { updateLineItemsGroups } from '../../../../../../services/estimates/estimates.clientView';

interface ItemGrouperProps {
    estimate: Estimate;
    groups: EstimateGroup[];
    settings: ClientViewSettings;
    onUpdate: () => void;
    onUpdateSettings: (settings: ClientViewSettings) => void;
}

export const ItemGrouper: React.FC<ItemGrouperProps> = ({ estimate, groups, settings, onUpdate, onUpdateSettings }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [localItemGroups, setLocalItemGroups] = useState<Record<string, string>>(
        estimate.lineItems.reduce((acc, item) => ({ ...acc, [item.id]: item.groupId || 'none' }), {})
    );

    const filteredItems = estimate.lineItems.filter(item =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleGroupChange = (itemId: string, groupId: string) => {
        setLocalItemGroups(prev => ({ ...prev, [itemId]: groupId }));
    };

    const handleToggleItemVisibility = (itemId: string) => {
        const hiddenItems = settings.hiddenLineItems || [];
        const newHiddenItems = hiddenItems.includes(itemId)
            ? hiddenItems.filter(id => id !== itemId)
            : [...hiddenItems, itemId];

        onUpdateSettings({ ...settings, hiddenLineItems: newHiddenItems });
    };

    const handleSaveAssignments = async () => {
        if (!estimate.id) return;
        setIsSaving(true);
        try {
            const assignments: Record<string, string | null> = {};
            Object.entries(localItemGroups).forEach(([id, groupId]) => {
                assignments[id] = groupId === 'none' ? null : groupId;
            });
            await updateLineItemsGroups(estimate.id, assignments);
            onUpdate();
        } catch (error) {
            console.error('Failed to save assignments:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const hasAssignmentChanges = JSON.stringify(localItemGroups) !== JSON.stringify(
        estimate.lineItems.reduce((acc, item) => ({ ...acc, [item.id]: item.groupId || 'none' }), {})
    );

    const getTypeIcon = (type?: string) => {
        switch (type) {
            case 'product': return <Package className="w-4 h-4 text-orange-500" />;
            case 'labor': return <Briefcase className="w-4 h-4 text-purple-500" />;
            case 'tool': return <Wrench className="w-4 h-4 text-blue-500" />;
            case 'equipment': return <Truck className="w-4 h-4 text-green-500" />;
            default: return <HelpCircle className="w-4 h-4 text-gray-400" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search line items..."
                        className="pl-10 pr-4 py-2 text-sm border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 w-full bg-gray-50"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                {filteredItems.map((item) => {
                    const isHidden = settings.hiddenLineItems?.includes(item.id);

                    return (
                        <div key={item.id} className={`p-3 rounded-xl border transition-all ${isHidden ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-blue-200'}`}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">{getTypeIcon(item.type)}</div>
                                    <div>
                                        <p className={`text-xs font-semibold leading-tight ${isHidden ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.description}</p>
                                        <p className="text-[10px] text-gray-500 mt-0.5">${item.total.toFixed(2)}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggleItemVisibility(item.id)}
                                    className={`p-1.5 rounded-lg shrink-0 transition-all ${isHidden
                                        ? 'text-red-500 bg-red-50'
                                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                        }`}
                                    title={isHidden ? 'Hidden from client' : 'Visible to client'}
                                >
                                    {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>

                            <select
                                className={`w-full px-2 py-1.5 rounded-lg border text-[10px] font-medium outline-none transition-all ${localItemGroups[item.id] !== 'none' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-100 bg-white'
                                    }`}
                                value={localItemGroups[item.id]}
                                onChange={(e) => handleGroupChange(item.id, e.target.value)}
                                disabled={isHidden}
                            >
                                <option value="none">General (No Group)</option>
                                {groups.map(group => (
                                    <option key={group.id} value={group.id}>{group.name}</option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>

            {/* Persistent Save Notice */}
            {hasAssignmentChanges && (
                <div className="pt-4 border-t border-gray-100">
                    <button
                        onClick={handleSaveAssignments}
                        disabled={isSaving}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Group assignments
                    </button>
                </div>
            )}
        </div>
    );
};