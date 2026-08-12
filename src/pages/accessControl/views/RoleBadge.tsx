// src/pages/accessControl/views/RoleBadge.tsx
import React from 'react';

interface RoleBadgeProps {
  roleName: string | null;
  isSuperuser?: boolean | null;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ roleName, isSuperuser }) => {
  if (!roleName) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border bg-gray-50 text-gray-500 border-gray-200">
        No role
      </span>
    );
  }

  const colorClasses = isSuperuser
    ? 'bg-purple-50 text-purple-700 border-purple-200'
    : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <span className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border ${colorClasses}`}>
      {roleName}
    </span>
  );
};

export default RoleBadge;
