// src/pages/accessControl/views/RoleFormModal.tsx
import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import type { PageDefinition, Role } from '../../../services/accessControl';

interface RoleFormModalProps {
  role: Role | null;
  pages: PageDefinition[];
  onClose: () => void;
  onSave: (input: { name: string; description: string; pageKeys: string[] }) => Promise<void>;
}

const RoleFormModal: React.FC<RoleFormModalProps> = ({ role, pages, onClose, onSave }) => {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [pageKeys, setPageKeys] = useState<string[]>(
    role && role.pageKeys !== '*' ? role.pageKeys : []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperuser = role?.isSuperuser ?? false;
  const isSystemRole = role?.isSystem ?? false;

  const togglePage = (key: string) => {
    setPageKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Role name is required');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), description: description.trim(), pageKeys });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save role');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 pb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{role ? 'Edit role' : 'Create role'}</h2>
            </div>
            <button
              onClick={onClose}
              className="ml-auto p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSystemRole}
              placeholder="e.g. Project manager"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What this role is for"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Page access</label>
            {isSuperuser ? (
              <p className="text-sm text-gray-500 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5">
                Superuser has access to every page automatically.
              </p>
            ) : (
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                {pages.map((page) => (
                  <label
                    key={page.key}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={pageKeys.includes(page.key)}
                      onChange={() => togglePage(page.key)}
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    {page.label}
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1.5">
              Feature-level permissions within a page aren't available yet &mdash; page access is the current
              granularity.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-3 p-6 pt-4 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving && <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" />}
            {role ? 'Save changes' : 'Create role'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleFormModal;
