// src/pages/people/People.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { getClientsGroupedByLetter, type Client } from '../../services/clients';
import { getEmployeesGroupedByLetter, type Employee } from '../../services/employees';
import PeopleHeader from './components/PeopleHeader';
import PeopleTabBar from './components/PeopleTabBar';
import ClientsList from '../clients/components/ClientsList';
import ClientsFilter from '../clients/components/ClientsFilter';
import ClientsCreationModal from '../clients/components/ClientsCreationModal';
import EmployeesList from '../employees/components/EmployeesList';
import EmployeesFilter from '../employees/components/EmployeesFilter';
import EmployeesCreationModal from '../employees/components/EmployeesCreationModal';
import { Plus } from 'lucide-react';

type PeopleTab = 'clients' | 'employees' | 'other';

const People: React.FC = () => {
  const { currentUser } = useAuthContext();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab state from URL params (defaults to 'clients')
  const [activeTab, setActiveTab] = useState<PeopleTab>(
    (searchParams.get('tab') as PeopleTab) || 'clients'
  );

  // Clients state
  const [clients, setClients] = useState<Record<string, Client[]>>({});
  const [filteredClients, setFilteredClients] = useState<Record<string, Client[]>>({});
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientSearchTerm, setClientSearchTerm] = useState('');

  // Employees state
  const [employees, setEmployees] = useState<Record<string, Employee[]>>({});
  const [filteredEmployees, setFilteredEmployees] = useState<Record<string, Employee[]>>({});
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  // Update URL when tab changes
  const handleTabChange = (tab: PeopleTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Load clients
  const loadClients = async () => {
    if (!currentUser) return;

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
    if (!currentUser) return;

    setIsLoadingEmployees(true);
    const result = await getEmployeesGroupedByLetter(currentUser.uid);

    if (result.success && result.data) {
      setEmployees(result.data);
      setFilteredEmployees(result.data);
    }
    setIsLoadingEmployees(false);
  };

  useEffect(() => {
    if (activeTab === 'clients') {
      loadClients();
    } else if (activeTab === 'employees') {
      loadEmployees();
    }
  }, [currentUser, activeTab]);

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
        client.name.toLowerCase().includes(searchLower)
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
        employee.name.toLowerCase().includes(searchLower)
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
    setEditingClient(client);
    setShowClientModal(true);
  };

  const handleClientModalClose = () => {
    setShowClientModal(false);
    setEditingClient(null);
  };

  const handleClientSaved = () => {
    loadClients();
    handleClientModalClose();
  };

  const handleClientDeleted = () => {
    loadClients();
  };

  const handleCreateEmployee = () => {
    setEditingEmployee(null);
    setShowEmployeeModal(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowEmployeeModal(true);
  };

  const handleEmployeeModalClose = () => {
    setShowEmployeeModal(false);
    setEditingEmployee(null);
  };

  const handleEmployeeSaved = () => {
    loadEmployees();
    handleEmployeeModalClose();
  };

  const handleEmployeeDeleted = () => {
    loadEmployees();
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="px-6 py-6">
        <PeopleHeader />
      </div>

      {/* Tab Bar */}
      <PeopleTabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <div className="h-full flex flex-col">
            {/* Clients Header with Search and Add Button */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Client Database</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage your client contacts and information
                  </p>
                </div>
                <button
                  onClick={handleCreateClient}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Client
                </button>
              </div>

              {/* Search Filter */}
              <ClientsFilter
                searchTerm={clientSearchTerm}
                onSearchChange={setClientSearchTerm}
              />
            </div>

            {/* Clients List */}
            <div className="flex-1 overflow-hidden">
              <ClientsList
                clientsGrouped={filteredClients}
                isLoading={isLoadingClients}
                onEditClient={handleEditClient}
                onClientDeleted={handleClientDeleted}
              />
            </div>

            {/* Creation/Edit Modal */}
            {showClientModal && (
              <ClientsCreationModal
                client={editingClient}
                onClose={handleClientModalClose}
                onSave={handleClientSaved}
              />
            )}
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="h-full flex flex-col">
            {/* Employees Header with Search and Add Button */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Employee Database</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Manage your employee contacts and information
                  </p>
                </div>
                <button
                  onClick={handleCreateEmployee}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Employee
                </button>
              </div>

              {/* Search Filter */}
              <EmployeesFilter
                searchTerm={employeeSearchTerm}
                onSearchChange={setEmployeeSearchTerm}
              />
            </div>

            {/* Employees List */}
            <div className="flex-1 overflow-hidden">
              <EmployeesList
                employeesGrouped={filteredEmployees}
                isLoading={isLoadingEmployees}
                onEditEmployee={handleEditEmployee}
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