// src/pages/accessControl/views/EditUserModal.tsx
import React, { useState } from 'react';
import { X, UserCog } from 'lucide-react';
import type { AccessControlUser, Role } from '../../../services/accessControl';

interface EditUserModalProps {
  user: AccessControlUser;
  roles: Role[];
  onClose: () => void;
  onSave: (roleId: number) => Promise<void>;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, roles, onClose, onSave }) => {
  const [roleId, setRoleId] = useState<number | ''>(user.roleId ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
