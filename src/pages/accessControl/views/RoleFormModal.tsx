// src/pages/accessControl/views/RoleFormModal.tsx
import React, { useState } from 'react';
import { X, ShieldCheck, Trash2 } from 'lucide-react';
import type { PageDefinition, Role } from '../../../services/accessControl';

interface RoleFormModalProps {
  role: Role | null;
  pages: PageDefinition[];
  canDelete?: boolean;
  onClose: () => void;
  onSave: (input: { name: string; description: string; pageKeys: string[] }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const RoleFormModal: React.FC<RoleFormModalProps> = ({
  role,
  pages,
  canDelete = false,
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [pageKeys, setPageKeys] = useState<string[]>(
    role && role.pageKeys !== '*' ? role.pageKeys : []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isSuperuser = role?.isSuperuser ?? false;
  const isSystemRole = role?.isSystem ?? false;

  const togglePage = (key: string) => {
    setPageKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete role');
      setIsDeleting(false);
    }
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

          {role && onDelete && (
            <div className="pt-2 pb-2 border-t border-gray-100">
              {!isConfirmingDelete ? (
                <button
                  onClick={() => {
                    setIsConfirmingDelete(true);
                    setDeleteError(null);
                  }}
                  disabled={!canDelete}
                  title={!canDelete ? 'At least one non-Superuser role must exist' : undefined}
                  className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 mt-3 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete role
                </button>
              ) : (
                <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <p className="text-sm text-red-800 font-semibold">
                    Are you sure you want to delete the &ldquo;{role.name}&rdquo; role? This cannot be undone.
                  </p>
                  {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={isDeleting}
                      className="flex-1 px-3 py-2 text-sm text-gray-700 font-semibold bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={isDeleting}
                      className="flex-1 px-3 py-2 text-sm text-white font-semibold bg-red-600 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isDeleting && <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" />}
                      Confirm
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
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
