import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, Layers, Save, Loader2, DollarSign } from 'lucide-react';
import type { EstimateGroup } from '../../../../../../services/estimates/estimates.types';

interface CustomGroupsManagerProps {
    groups: EstimateGroup[];
    onSave: (groups: EstimateGroup[]) => void;
    isSaving: boolean;
}

export const CustomGroupsManager: React.FC<CustomGroupsManagerProps> = ({ groups, onSave, isSaving }) => {
    const [localGroups, setLocalGroups] = useState<EstimateGroup[]>(groups);
    const [isAdding, setIsAdding] = useState(false);
    const [newGroup, setNewGroup] = useState<Partial<EstimateGroup>>({
        name: '',
        description: '',
        showPrice: true
    });
    const [editingId, setEditingId] = useState<string | null>(null);

    React.useEffect(() => {
        setLocalGroups(groups);
    }, [groups]);

    const handleAddGroup = () => {
        if (!newGroup.name) return;
        const group: EstimateGroup = {
            id: Date.now().toString(),
            name: newGroup.name,
            description: newGroup.description || '',
            showPrice: newGroup.showPrice ?? true
        };
        setLocalGroups([...localGroups, group]);
        setNewGroup({ name: '', description: '', showPrice: true });
        setIsAdding(false);
    };

    const handleDeleteGroup = (id: string) => {
        setLocalGroups(localGroups.filter(g => g.id !== id));
    };

    const handleUpdateGroup = (id: string, updates: Partial<EstimateGroup>) => {
        setLocalGroups(localGroups.map(g => g.id === id ? { ...g, ...updates } : g));
    };

    const hasChanges = JSON.stringify(localGroups) !== JSON.stringify(groups);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Custom Groups</h3>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Group
                    </button>
                )}
            </div>

            {/* Add Group Form */}
            {isAdding && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">Group Name</label>
                            <input
                                type="text"
                                autoFocus
                                placeholder="e.g. Master Bathroom, Phase 1"
                                className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={newGroup.name}
                                onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setNewGroup({ ...newGroup, showPrice: !newGroup.showPrice })}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${newGroup.showPrice
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-200'
                                    }`}
                            >
                                <DollarSign className="w-4 h-4" />
                                {newGroup.showPrice ? 'Show Price' : 'Hide Price'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">Description (Optional)</label>
                        <textarea
                            placeholder="Briefly describe what this group covers..."
                            rows={2}
                            className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={newGroup.description}
                            onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddGroup}
                            disabled={!newGroup.name}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-lg transition-colors"
                        >
                            Create Group
                        </button>
                    </div>
                </div>
            )}

            {/* Groups List */}
            <div className="space-y-3">
                {localGroups.length === 0 && !isAdding && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No custom groups created yet.</p>
                    </div>
                )}
                {localGroups.map((group) => (
                    <div key={group.id} className="group bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-200 transition-all hover:shadow-sm">
                        {editingId === group.id ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={group.name}
                                        onChange={e => handleUpdateGroup(group.id, { name: e.target.value })}
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleUpdateGroup(group.id, { showPrice: !group.showPrice })}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm ${group.showPrice
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-600 border-gray-200'
                                                }`}
                                        >
                                            <DollarSign className="w-4 h-4" />
                                            {group.showPrice ? 'Show Price' : 'Hide Price'}
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                        >
                                            <Check className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    rows={2}
                                    value={group.description}
                                    onChange={e => handleUpdateGroup(group.id, { description: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                        <Layers className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-gray-900">{group.name}</h4>
                                            {!group.showPrice && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">
                                                    <DollarSign className="w-3 h-3" /> Hidden
                                                </span>
                                            )}
                                        </div>
                                        {group.description && <p className="text-sm text-gray-500 mt-1">{group.description}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setEditingId(group.id)}
                                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteGroup(group.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={() => onSave(localGroups)}
                    disabled={!hasChanges || isSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Groups
                </button>
            </div>
        </div>
    );
};
