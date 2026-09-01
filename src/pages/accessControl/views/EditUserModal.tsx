// src/pages/accessControl/views/EditUserModal.tsx
import React, { useState } from 'react';
import { X, UserCog, Trash2 } from 'lucide-react';
import type { AccessControlUser, Role } from '../../../services/accessControl';

interface EditUserModalProps {
  user: AccessControlUser;
  roles: Role[];
  onClose: () => void;
  onSave: (roleId: number) => Promise<void>;
  onDelete: () => Promise<void>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, roles, onClose, onSave, onDelete }) => {
  const [roleId, setRoleId] = useState<number | ''>(user.roleId ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirmEmail' | 'confirmFinal'>('idle');
  const [deleteEmailInput, setDeleteEmailInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSave = async () => {
    if (roleId === '') return;
    setIsSaving(true);
    setError(null);
    try {
      await onSave(roleId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete user');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <UserCog className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit user</h2>
              <p className="text-sm text-gray-500">{user.displayName || user.email}</p>
            </div>
            <button
              onClick={onClose}
              className="ml-auto p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="text-sm text-gray-900 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                {user.email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              >
                <option value="" disabled>
                  Select a role&hellip;
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                Page access and permission overrides are managed on the Roles &amp; Permissions tab.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="pt-2 border-t border-gray-100">
              {deleteStep === 'idle' && (
                <button
                  onClick={() => {
                    setDeleteStep('confirmEmail');
                    setDeleteEmailInput('');
                    setDeleteError(null);
                  }}
                  className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 mt-3"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete user
                </button>
              )}

              {deleteStep === 'confirmEmail' && (
                <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <p className="text-sm text-red-800">
                    To delete this user, type their email address to confirm:
                  </p>
                  <p className="text-xs font-mono text-red-700 select-all">{user.email}</p>
                  <input
                    type="text"
                    value={deleteEmailInput}
                    onChange={(e) => setDeleteEmailInput(e.target.value)}
                    placeholder="Enter email to confirm"
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setDeleteStep('idle')}
                      className="flex-1 px-3 py-2 text-sm text-gray-700 font-semibold bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setDeleteStep('confirmFinal')}
                      disabled={deleteEmailInput.trim().toLowerCase() !== user.email.trim().toLowerCase()}
                      className="flex-1 px-3 py-2 text-sm text-white font-semibold bg-red-600 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 'confirmFinal' && (
                <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <p className="text-sm text-red-800 font-semibold">
                    Are you sure you want to permanently delete {user.email}? This cannot be undone.
                  </p>
                  {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteStep('idle')}
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
          </div>

          <div className="flex gap-3 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 text-gray-700 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || roleId === ''}
              className="flex-1 px-4 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving && <div className="w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin" />}
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
