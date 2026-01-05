// src/pages/people/People.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';
import { getClientsGroupedByLetter, type Client } from '../../services/clients';
import PeopleHeader from './components/PeopleHeader';
import PeopleTabBar from './components/PeopleTabBar';
import ClientsList from '../clients/components/ClientsList';
import ClientsFilter from '../clients/components/ClientsFilter';
import ClientsCreationModal from '../clients/components/ClientsCreationModal';
import { Plus, Users } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Update URL when tab changes
  const handleTabChange = (tab: PeopleTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Load clients
  const loadClients = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    const result = await getClientsGroupedByLetter(currentUser.uid);

    if (result.success && result.data) {
      setClients(result.data);
      setFilteredClients(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'clients') {
      loadClients();
    }
  }, [currentUser, activeTab]);

  // Filter clients based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
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
  }, [searchTerm, clients]);

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowCreationModal(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowCreationModal(true);
  };

  const handleModalClose = () => {
    setShowCreationModal(false);
    setEditingClient(null);
  };

  const handleClientSaved = () => {
    loadClients();
    handleModalClose();
  };

  const handleClientDeleted = () => {
    loadClients();
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
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            </div>

            {/* Clients List */}
            <div className="flex-1 overflow-hidden">
              <ClientsList
                clientsGrouped={filteredClients}
                isLoading={isLoading}
                onEditClient={handleEditClient}
                onClientDeleted={handleClientDeleted}
              />
            </div>

            {/* Creation/Edit Modal */}
            {showCreationModal && (
              <ClientsCreationModal
                client={editingClient}
                onClose={handleModalClose}
                onSave={handleClientSaved}
              />
            )}
          </div>
        )}

        {/* Employees Tab - Placeholder */}
        {activeTab === 'employees' && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Employees Section
              </h3>
              <p className="text-gray-600">Coming soon</p>
            </div>
          </div>
        )}

        {/* Other Tab - Won't render since it's disabled */}
      </div>
    </div>
  );
};

export default People;