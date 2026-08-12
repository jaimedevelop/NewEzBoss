// src/pages/accessControl/views/RolesList.tsx
import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { PageDefinition, Role } from '../../../services/accessControl';

interface RolesListProps {
  roles: Role[];
  pages: PageDefinition[];
  isLoading: boolean;
  onEditRole: (role: Role) => void;
}

const RolesList: React.FC<RolesListProps> = ({ roles, pages, isLoading, onEditRole }) => {
  const labelFor = (key: string) => pages.find((p) => p.key === key)?.label ?? key;

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-sm text-gray-500">
        Loading roles&hellip;
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {roles.map((role) => (
        <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  role.isSuperuser ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{role.name}</div>
                {role.description && (
                  <div className="text-sm text-gray-500">{role.description}</div>
                )}
              </div>
            </div>
            <button
              onClick={() => onEditRole(role)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Edit
            </button>
          </div>

          <div className="mt-4">
            {role.isSuperuser ? (
              <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                Full access
              </span>
            ) : role.pageKeys.length === 0 ? (
              <span className="text-xs text-gray-400">No page access granted</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {role.pageKeys.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-gray-50 text-gray-600 border border-gray-200"
                  >
                    {labelFor(key)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RolesList;
