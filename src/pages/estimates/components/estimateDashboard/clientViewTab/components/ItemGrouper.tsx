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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Assign Items to Groups</h3>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        className="pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-gray-700">Line Item</th>
                            <th className="px-6 py-3 font-semibold text-gray-700">Display Group</th>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-center">Visibility</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredItems.map((item) => {
                            const isHidden = settings.hiddenLineItems?.includes(item.id);

                            return (
                                <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isHidden ? 'bg-gray-50/50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {getTypeIcon(item.type)}
                                            <div>
                                                <p className={`font-medium ${isHidden ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                    {item.description}
                                                </p>
                                                <p className="text-xs text-gray-500">${item.total.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <select
                                            className={`px-3 py-1.5 rounded-lg border text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all ${localItemGroups[item.id] !== 'none' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white'
                                                }`}
                                            value={localItemGroups[item.id]}
                                            onChange={(e) => handleGroupChange(item.id, e.target.value)}
                                            disabled={isHidden}
                                        >
                                            <option value="none">No Group (General)</option>
                                            {groups.map(group => (
                                                <option key={group.id} value={group.id}>{group.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleToggleItemVisibility(item.id)}
                                                className={`p-2 rounded-lg transition-all ${isHidden
                                                    ? 'text-red-500 bg-red-50 hover:bg-red-100'
                                                    : 'text-green-600 bg-green-50 hover:bg-green-100'
                                                    }`}
                                                title={isHidden ? 'Hidden from client' : 'Visible to client'}
                                            >
                                                {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSaveAssignments}
                    disabled={!hasAssignmentChanges || isSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Group Assignments
                </button>
            </div>
        </div>
    );
};
