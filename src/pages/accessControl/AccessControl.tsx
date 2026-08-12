// src/pages/accessControl/AccessControl.tsx
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, UserPlus, Plus } from 'lucide-react';
import VariableHeader from '../../mainComponents/ui/VariableHeader';
import AccessControlTabBar, { type AccessControlTab } from './views/AccessControlTabBar';
import UsersTable from './views/UsersTable';
import InviteUserModal from './views/InviteUserModal';
import EditUserModal from './views/EditUserModal';
import RolesList from './views/RolesList';
import RoleFormModal from './views/RoleFormModal';
import { useAccessControlUsers } from './logic/useAccessControlUsers';
import { useAccessControlRoles } from './logic/useAccessControlRoles';
import type { AccessControlUser, Role } from '../../services/accessControl';

const AccessControl: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AccessControlTab>(
    (searchParams.get('tab') as AccessControlTab) || 'users'
  );

  const { users, isLoading: usersLoading, changeUserRole } = useAccessControlUsers();
  const { roles, pages, isLoading: rolesLoading, addRole, editRole } = useAccessControlRoles();

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AccessControlUser | null>(null);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const handleTabChange = (tab: AccessControlTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setShowRoleModal(true);
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setShowRoleModal(true);
  };

  const handleRoleModalClose = () => {
    setShowRoleModal(false);
    setEditingRole(null);
  };

  return (
    <div className="space-y-8">
      <VariableHeader
        title="Access Control"
        subtitle="Manage users, roles, and page permissions"
        Icon={ShieldCheck}
      />

      <AccessControlTabBar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="space-y-6">
        {activeTab === 'users' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Users</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Everyone with access to this workspace
                </p>
              </div>
              <button
                disabled
                title="Email invites aren't available yet"
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg opacity-50 cursor-not-allowed"
              >
                <UserPlus className="w-5 h-5" />
                Invite user
              </button>
            </div>

            <UsersTable users={users} isLoading={usersLoading} onEditUser={setEditingUser} />

            {showInviteModal && (
              <InviteUserModal roles={roles} onClose={() => setShowInviteModal(false)} />
            )}

            {editingUser && (
              <EditUserModal
                user={editingUser}
                roles={roles}
                onClose={() => setEditingUser(null)}
                onSave={(roleId) => changeUserRole(editingUser.id, roleId).then(() => undefined)}
              />
            )}
          </>
        )}

        {activeTab === 'roles' && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Roles & permissions</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Define what each role can access. Superuser always has full access.
                </p>
              </div>
              <button
                onClick={handleCreateRole}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add role
              </button>
            </div>

            <RolesList roles={roles} pages={pages} isLoading={rolesLoading} onEditRole={handleEditRole} />

            {showRoleModal && (
              <RoleFormModal
                role={editingRole}
                pages={pages}
                onClose={handleRoleModalClose}
                onSave={(input) =>
                  editingRole ? editRole(editingRole.id, input) : addRole(input)
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AccessControl;
