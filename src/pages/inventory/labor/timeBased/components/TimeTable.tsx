import React from 'react';
import { Pencil, Trash2, TrendingUp } from 'lucide-react';
import { TimeBasedLabor } from '../TimeBased';

interface TimeTableProps {
  roles: TimeBasedLabor[];
  loading: boolean;
  onEdit: (role: TimeBasedLabor) => void;
  onDelete: (roleId: string) => void;
}

const skillLevelColors = {
  entry: 'bg-gray-100 text-gray-800',
  intermediate: 'bg-blue-100 text-blue-800',
  advanced: 'bg-purple-100 text-purple-800',
  expert: 'bg-orange-100 text-orange-800',
};

const skillLevelLabels = {
  entry: 'Entry',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export const TimeTable: React.FC<TimeTableProps> = ({ roles, loading, onEdit, onDelete }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading roles...</p>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No roles found. Create your first role to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Skill Level
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hourly Rate
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {roles.map((role) => (
            <tr key={role.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4">
                <div>
                  <div className="text-sm font-medium text-gray-900">{role.roleName}</div>
                  {role.description && (
                    <div className="text-sm text-gray-500">{role.description}</div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  {role.category}
                </span>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${skillLevelColors[role.skillLevel]}`}>
                  {skillLevelLabels[role.skillLevel]}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center text-sm font-semibold text-gray-900">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                  ${role.hourlyRate.toFixed(2)}/hr
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    role.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {role.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                <button
                  onClick={() => onEdit(role)}
                  className="inline-flex items-center p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Edit role"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(role.id)}
                  className="inline-flex items-center p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete role"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimeTable;