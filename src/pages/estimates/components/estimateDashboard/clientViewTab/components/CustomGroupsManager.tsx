import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Layers, DollarSign, Check } from 'lucide-react';
import type { EstimateGroup } from '../../../../../../services/estimates/estimates.types';

interface CustomGroupsManagerProps {
    groups: EstimateGroup[];
    onSave: (groups: EstimateGroup[]) => void;
    isSaving: boolean;
    selectingGroupId: string | null;
    setSelectingGroupId: (id: string | null) => void;
}

export const CustomGroupsManager: React.FC<CustomGroupsManagerProps> = ({
    groups,
    onSave,
    selectingGroupId,
    setSelectingGroupId
}) => {
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
        const groupId = Date.now().toString();
        const group: EstimateGroup = {
            id: groupId,
            name: newGroup.name,
            description: newGroup.description || '',
            showPrice: newGroup.showPrice ?? true
        };
        const updatedGroups = [...localGroups, group];
        setLocalGroups(updatedGroups);
        onSave(updatedGroups);
        setNewGroup({ name: '', description: '', showPrice: true });
        setIsAdding(false);
        setSelectingGroupId(groupId);
    };

    const handleDeleteGroup = (id: string) => {
        const updatedGroups = localGroups.filter(g => g.id !== id);
        setLocalGroups(updatedGroups);
        onSave(updatedGroups);
    };

    const handleUpdateGroup = (id: string, updates: Partial<EstimateGroup>) => {
        setLocalGroups(localGroups.map(g => g.id === id ? { ...g, ...updates } : g));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Custom Groups</h3>
                {!isAdding && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Group
                    </button>
                )}
            </div>

            {/* Add Group Form */}
            {isAdding && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Group Name</label>
                            <input
                                type="text"
                                autoFocus
                                placeholder="e.g. Master Bathroom"
                                className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                value={newGroup.name}
                                onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setNewGroup({ ...newGroup, showPrice: !newGroup.showPrice })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${newGroup.showPrice
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-gray-600 border-gray-200'
                                    }`}
                            >
                                <DollarSign className="w-3 h-3" />
                                {newGroup.showPrice ? 'Show Price' : 'Hide Price'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-blue-700 uppercase mb-1">Description (Optional)</label>
                        <textarea
                            placeholder="Brief description..."
                            rows={2}
                            className="w-full px-3 py-1.5 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            value={newGroup.description}
                            onChange={e => setNewGroup({ ...newGroup, description: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => {
                                setIsAdding(false);
                                setSelectingGroupId(null);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddGroup}
                            disabled={!newGroup.name}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-lg transition-colors shadow-sm"
                        >
                            Create Group
                        </button>
                    </div>
                </div>
            )}

            {/* Groups List */}
            <div className="space-y-2">
                {localGroups.length === 0 && !isAdding && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100 italic">
                        <Layers className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-[10px] text-gray-400">No custom groups created yet.</p>
                    </div>
                )}
                {localGroups.map((group) => {
                    const isActive = selectingGroupId === group.id;

                    return (
                        <div
                            key={group.id}
                            className={`group border rounded-xl p-3 transition-all ${isActive
                                ? 'bg-orange-50 border-orange-200 shadow-sm'
                                : 'bg-white border-gray-100 hover:border-blue-200'
                                }`}
                        >
                            {editingId === group.id ? (
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-4">
                                            <input
                                                type="text"
                                                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={group.name}
                                                onChange={e => handleUpdateGroup(group.id, { name: e.target.value })}
                                            />
                                            <button
                                                onClick={() => {
                                                    setEditingId(null);
                                                    onSave(localGroups);
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm"
                                            >
                                                Done
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <button
                                                onClick={() => handleUpdateGroup(group.id, { showPrice: !group.showPrice })}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold ${group.showPrice
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-gray-600 border-gray-200'
                                                    }`}
                                            >
                                                <DollarSign className="w-3 h-3" />
                                                {group.showPrice ? 'Show Price' : 'Hide Price'}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        rows={2}
                                        placeholder="Group description..."
                                        value={group.description}
                                        onChange={e => handleUpdateGroup(group.id, { description: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex gap-3">
                                            <div className={`p-2 rounded-lg shrink-0 ${isActive ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                                                <Layers className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <h4 className={`text-xs font-bold truncate ${isActive ? 'text-orange-900' : 'text-gray-900'}`}>{group.name}</h4>
                                                    {!group.showPrice && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-50 text-amber-700 uppercase border border-amber-100">
                                                            Hidden
                                                        </span>
                                                    )}
                                                </div>
                                                {group.description && <p className={`text-[10px] mt-0.5 line-clamp-2 ${isActive ? 'text-orange-700/70' : 'text-gray-500'}`}>{group.description}</p>}
                                            </div>
                                        </div>
                                        {!isActive && (
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button
                                                    onClick={() => setEditingId(group.id)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteGroup(group.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setSelectingGroupId(isActive ? null : group.id)}
                                        className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-[10px] font-bold transition-all ${isActive
                                            ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-200'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-orange-200 hover:text-orange-600'
                                            }`}
                                    >
                                        {isActive ? (
                                            <>
                                                <Check className="w-3.5 h-3.5" />
                                                Select items to add
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="w-3.5 h-3.5" />
                                                Add items to group
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
