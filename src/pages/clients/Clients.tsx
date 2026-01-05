// src/pages/clients/Clients.tsx

import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../contexts/AuthContext';
import { getClientsGroupedByLetter, type Client } from '../../services/clients';
import ClientsList from './components/ClientsList';
import ClientsFilter from './components/ClientsFilter';
import ClientsCreationModal from './components/ClientsCreationModal';
import { Plus } from 'lucide-react';

const Clients: React.FC = () => {
  const { currentUser } = useAuthContext();
  const [clients, setClients] = useState<Record<string, Client[]>>({});
  const [filteredClients, setFilteredClients] = useState<Record<string, Client[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
    loadClients();
  }, [currentUser]);

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
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your client database
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
        <div className="mt-4">
          <ClientsFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        </div>
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
  );
};

export default Clients;