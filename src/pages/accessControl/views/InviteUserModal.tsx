// src/pages/accessControl/views/InviteUserModal.tsx
import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import type { Role } from '../../../services/accessControl';

interface InviteUserModalProps {
  roles: Role[];
  onClose: () => void;
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ roles, onClose }) => {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Invite user</h2>
            </div>
            <button
              onClick={onClose}
              className="ml-auto p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Invites are not sent yet &mdash; email delivery isn't set up. This form is a preview of what's coming.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              >
                <option value="">Select a role&hellip;</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
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
              disabled
              title="Email invites aren't available yet"
              className="flex-1 px-4 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-200 opacity-50 cursor-not-allowed"
            >
              Send invite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteUserModal;
