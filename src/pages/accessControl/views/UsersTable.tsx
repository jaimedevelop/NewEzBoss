// src/pages/accessControl/views/UsersTable.tsx
import React from 'react';
import type { AccessControlUser } from '../../../services/accessControl';
import RoleBadge from './RoleBadge';

interface UsersTableProps {
  users: AccessControlUser[];
  isLoading: boolean;
  onEditUser: (user: AccessControlUser) => void;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const UsersTable: React.FC<UsersTableProps> = ({ users, isLoading, onEditUser }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-sm text-gray-500">
        Loading users&hellip;
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-sm text-gray-500">
        No users yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">App access</th>
              <th className="px-6 py-3">Updated</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-gray-900">
                    {user.displayName || 'Unnamed user'}
                  </div>
                  <div className="text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4">
                  <RoleBadge roleName={user.roleName} isSuperuser={user.isSuperuser} />
                </td>
                <td className="px-6 py-4 text-gray-600">{formatDate(user.updatedAt)}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onEditUser(user)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UsersTable;
