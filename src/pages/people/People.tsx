// src/pages/people/People.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { getClientsGroupedByLetter, type Client } from '../../services/clients';
import { getEmployeesGroupedByLetter, getEmployeeById, type Employee } from '../../services/employees';
import { reconcileItems, upsertEmployee, removeEmployee } from './employees/employeeListState';
import PeopleTabBar from './components/PeopleTabBar';
import ClientsList from './clients/components/ClientsList';
import ClientsFilter from './clients/components/ClientsFilter';
import ClientsCreationModal from './clients/components/ClientsCreationModal';
import ClientsImportModal from './clients/components/ClientsImportModal';
import type { AccountInvitation, InvitationAction } from '../../services/employees/accountInvitations';
import EmployeeInvitations from './employees/EmployeeInvitations';
import CompanyPositions from './employees/CompanyPositions';
import EmployeesList from './employees/EmployeesList';
import EmployeesFilter from './employees/EmployeesFilter';
import EmployeesCreationModal from './employees/EmployeesCreationModal';
import { Plus, Upload, Users, UserPlus } from 'lucide-react';
import VariableHeader from '../../mainComponents/ui/VariableHeader';

type PeopleTab = 'clients' | 'employees' | 'other';

const People: React.FC = () => {
  const { currentUser, canAccessPage, canPerform } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state from URL params (defaults to the first tab the user can access)
  const defaultTab: PeopleTab = canAccessPage('clients')
    ? 'clients'
    : canAccessPage('employees')
    ? 'employees'
    : 'clients';
  const requestedTab = searchParams.get('tab');
  const activeTab: PeopleTab = requestedTab === 'clients' && canAccessPage('clients') ? 'clients'
    : requestedTab === 'employees' && canAccessPage('employees') ? 'employees' : defaultTab;


  // Clients state
  const [clients, setClients] = useState<Record<string, Client[]>>({});
  const [filteredClients, setFilteredClients] = useState<Record<string, Client[]>>({});
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showClientImportModal, setShowClientImportModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDuplicatingClient, setIsDuplicatingClient] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Employees state
  const [employees, setEmployees] = useState<Record<string, Employee[]>>({});
  const [filteredEmployees, setFilteredEmployees] = useState<Record<string, Employee[]>>({});
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [employeeError, setEmployeeError] = useState('');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showPositionsModal, setShowPositionsModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [invitationStatuses, setInvitationStatuses] = useState<AccountInvitation[]>([]);
  const [invitationBusy, setInvitationBusy] = useState(false);
  const [invitationAction, setInvitationAction] = useState<{ invitation: AccountInvitation; action: InvitationAction } | null>(null);
  const [canInvite, setCanInvite] = useState(false);
  const [inviteRequest, setInviteRequest] = useState(0);
  const [inviteTarget, setInviteTarget] = useState<Employee | null>(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  const loadedEmployeeUser = useRef<string | null>(null);
  const userId = currentUser?.uid;
  const statusesRef = useRef<AccountInvitation[]>([]);

  const refreshEmployee = async (id: string) => {
    const result = await getEmployeeById(id);
    if (result.success && result.data) {
      setEmployees(previous => upsertEmployee(previous, result.data!));
    } else {
      setEmployeeError(result.error || 'Failed to update employee');
    }
  };

  const handleStatuses = (items: AccountInvitation[], allowed: boolean) => {
    const previous = statusesRef.current;
    const next = reconcileItems(previous, items);
    statusesRef.current = next;
    setInvitationStatuses(next);
    setCanInvite(allowed);
    items.forEach(item => {
      const old = previous.find(value => value.id === item.id);
      if (item.status === 'accepted' && item.employeeId &&
          ((!old && !Object.values(employees).flat().some(employee => employee.id === String(item.employeeId))) ||
           (old && (old.status !== 'accepted' || old.employeeId !== item.employeeId)))) {
        void refreshEmployee(String(item.employeeId));
      }
    });
  };

  // Update URL when tab changes
  const handleTabChange = (tab: PeopleTab) => {
    if (tab === 'other' || !canAccessPage(tab)) return;
    setSearchParams({ tab });
  };

  // Load clients
  const loadClients = async () => {
    if (!currentUser || !canPerform('read:clients')) return;

    setIsLoadingClients(true);
    const result = await getClientsGroupedByLetter(currentUser.uid);

    if (result.success && result.data) {
      setClients(result.data);
      setFilteredClients(result.data);
    }
    setIsLoadingClients(false);
  };

  // Load employees
  const loadEmployees = async () => {
    if (!currentUser || !canAccessPage('employees')) return;

    setIsLoadingEmployees(loadedEmployeeUser.current !== currentUser.uid);
    setEmployeeError('');
    const result = await getEmployeesGroupedByLetter();

    if (result.success && result.data) {
      setEmployees(result.data);
      loadedEmployeeUser.current = currentUser.uid;
    } else {
      setEmployees({});
      setFilteredEmployees({});
      setEmployeeError(result.error || 'Failed to load employees');
    }
    setIsLoadingEmployees(false);
  };

  useEffect(() => {
    if (activeTab === 'clients') {
      loadClients();
    } else if (activeTab === 'employees' && userId && loadedEmployeeUser.current !== userId) {
      loadEmployees();
    }
  }, [userId, activeTab]);

  // Filter clients based on search term
  useEffect(() => {
    if (!clientSearchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }

    const searchLower = clientSearchTerm.toLowerCase();
    const filtered: Record<string, Client[]> = {};

    Object.keys(clients).forEach(letter => {
      const matchingClients = clients[letter].filter(client =>
        (client.name || '').toLowerCase().includes(searchLower)
      );

      if (matchingClients.length > 0) {
        filtered[letter] = matchingClients;
      }
    });

    setFilteredClients(filtered);
  }, [clientSearchTerm, clients]);

  // Filter employees based on search term
  useEffect(() => {
    if (!employeeSearchTerm.trim()) {
      setFilteredEmployees(employees);
      return;
    }

    const searchLower = employeeSearchTerm.toLowerCase();
    const filtered: Record<string, Employee[]> = {};

    Object.keys(employees).forEach(letter => {
      const matchingEmployees = employees[letter].filter(employee =>
        (employee.name || '').toLowerCase().includes(searchLower)
      );

      if (matchingEmployees.length > 0) {
        filtered[letter] = matchingEmployees;
      }
    });

    setFilteredEmployees(filtered);
  }, [employeeSearchTerm, employees]);

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowClientModal(true);
  };

  const handleEditClient = (client: Client) => {
    if (!canPerform('write:clients')) return;
    setEditingClient(client);
    setShowClientModal(true);
  };

  const handleClientModalClose = () => {
    setShowClientModal(false);
    setEditingClient(null);
    setIsDuplicatingClient(false);
  };

  const handleClientSaved = () => {
    loadClients();
    handleClientModalClose();
  };

  const handleClientDeleted = () => {
    loadClients();
  };

  const handleDuplicateClient = (client: Client) => {
    if (!canPerform('write:clients')) return;
    setEditingClient(client);
    setIsDuplicatingClient(true);
    setShowClientModal(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowEmployeeModal(true);
  };

  const handleEmployeeModalClose = () => {
    setShowEmployeeModal(false);
    setEditingEmployee(null);
  };

  const handleEmployeeSaved = (employeeId: string) => {
    void refreshEmployee(employeeId);
    handleEmployeeModalClose();
  };

  const handleEmployeeDeleted = (id: string) => {
    setEmployees(previous => removeEmployee(previous, id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <VariableHeader
        title="People"
        subtitle="Manage clients, employees, and other contacts"
        Icon={Users}
      />


      {/* Tab Bar */}
      <PeopleTabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Content Area */}
      <div className="space-y-8">
        {/* Clients Tab */}
        {activeTab === 'clients' && canAccessPage('clients') && (
          <div className="space-y-6">
            {/* Clients Header with Search and Add Button */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Client Database</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage your client contacts and information
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={!canPerform('write:clients')} onClick={() => setShowClientImportModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                    Import Clients
                  </button>
                  <button
                    disabled={!canPerform('write:clients')} onClick={handleCreateClient}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Client
                  </button>
                </div>
              </div>

              {/* Search Filter */}
              <ClientsFilter
                searchTerm={clientSearchTerm}
                onSearchChange={setClientSearchTerm}
              />
            </div>

            {/* Clients List */}
            <div>
              <ClientsList
                clientsGrouped={filteredClients}
                searchTerm={clientSearchTerm}
                isLoading={isLoadingClients}
                onEditClient={handleEditClient}
                onDuplicateClient={handleDuplicateClient}
                onClientDeleted={handleClientDeleted}
              />
            </div>

            {/* Creation/Edit Modal */}
            {showClientModal && (
              <ClientsCreationModal
                client={editingClient}
                isDuplicate={isDuplicatingClient}
                onClose={handleClientModalClose}
                onSave={handleClientSaved}
              />
            )}

            {/* Import Modal */}
            {showClientImportModal && (
              <ClientsImportModal
                onClose={() => setShowClientImportModal(false)}
                onImported={loadClients}
              />
            )}
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && canAccessPage('employees') && (
          <div className="space-y-6">
            {/* Employees Header with Search and Add Button */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Employee Database</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage your employee contacts and information
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowPositionsModal(true)} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><Users className="w-5 h-5" />Positions</button>
                  <button
                    disabled={!canPerform('write:employees')}
                    onClick={() => { setEditingEmployee(null); setShowEmployeeModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                    Add Employee (manually)
                  </button>
                  <button
                    disabled={invitationBusy}
                    onClick={() => setInviteRequest(request => request + 1)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  >
                    <UserPlus className="w-5 h-5" />
                    Invite Employee
                  </button>
                </div>

              </div>

              {/* Search Filter */}
              <EmployeesFilter
                searchTerm={employeeSearchTerm}
                onSearchChange={setEmployeeSearchTerm}
              />
            </div>

            <CompanyPositions key={userId} open={showPositionsModal} onClose={() => setShowPositionsModal(false)} />
            <EmployeeInvitations inviteRequest={inviteRequest} target={inviteTarget} actionTarget={invitationAction} onActionHandled={() => setInvitationAction(null)} onBusy={setInvitationBusy}
              onTargetHandled={() => setInviteTarget(null)} onChanged={id => void refreshEmployee(id)}
              onStatuses={handleStatuses} />

            {/* Employees List */}
            {employeeError && (
              <div role="alert" className="p-4 bg-red-50 text-red-700 rounded-lg">
                {employeeError}
                <button onClick={loadEmployees} className="ml-4 underline">Retry</button>
              </div>
            )}
            <div>
              <EmployeesList
                employeesGrouped={filteredEmployees}
                searchTerm={employeeSearchTerm}
                isLoading={isLoadingEmployees}
                onEditEmployee={handleEditEmployee}
                onInviteEmployee={setInviteTarget}
                invitations={invitationStatuses} canInvite={canInvite} invitationBusy={invitationBusy}
                allEmployees={Object.values(employees).flat()} onInvitationAction={(invitation, action) => setInvitationAction({ invitation, action })}
                onEmployeeDeleted={handleEmployeeDeleted}
              />
            </div>

            {/* Creation/Edit Modal */}
            {showEmployeeModal && (
              <EmployeesCreationModal
                employee={editingEmployee}
                onClose={handleEmployeeModalClose}
                onSave={handleEmployeeSaved}
              />
            )}
          </div>
        )}

        {/* Other Tab - Won't render since it's disabled */}
      </div>
    </div>
  );
};

export default People;
