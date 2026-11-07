// src/pages/clients/Clients.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getClient, getClientsGroupedByLetter, type Client } from '../../../services/clients';
import { CLIENTS_UPDATED_EVENT } from '../../../services/clients/clientsApi';
import ClientsList from './components/ClientsList';
import ClientsFilter from './components/ClientsFilter';
import ClientsCreationModal from './components/ClientsCreationModal';
import ClientsImportModal from './components/ClientsImportModal';
import { Plus, Upload } from 'lucide-react';

const Clients: React.FC = () => {
  const { currentUser } = useAuthContext();
  const [clients, setClients] = useState<Record<string, Client[]>>({});
  const [filteredClients, setFilteredClients] = useState<Record<string, Client[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [error, setError] = useState<string | null>(null);
  const loadVersion = useRef(0);

  // Load clients
  const loadClients = async (background = false) => {
    if (!currentUser) return;

    const version = ++loadVersion.current;
    if (!background) setIsLoading(true);
    const result = await getClientsGroupedByLetter(currentUser.uid);

    if (version !== loadVersion.current) return;
    if (result.success && result.data) {
      setClients(result.data);
      setFilteredClients(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void loadClients();
    const refresh = () => { void loadClients(true); };
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    window.addEventListener(CLIENTS_UPDATED_EVENT, refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      ++loadVersion.current;
      window.removeEventListener('focus', refresh);
      window.removeEventListener(CLIENTS_UPDATED_EVENT, refresh);
      document.removeEventListener('visibilitychange', visible);
    };
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
        (client.companyName || client.name || '').toLowerCase().includes(searchLower)
      );

      if (matchingClients.length > 0) {
        filtered[letter] = matchingClients;
      }
    });

    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const handleCreateClient = () => {
    setIsDuplicate(false);
    setEditingClient(null);
    setShowCreationModal(true);
  };

  const handleEditClient = async (client: Client) => {
    if (!client.id) return;
    setError(null);
    const result = await getClient(client.id);
    if (!result.success || !result.data) {
      setError(result.error || 'Could not load the latest client. Please retry.');
      return;
    }
    setIsDuplicate(false);
    setEditingClient(result.data);
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-5 h-5" />
              Import Clients
            </button>
            <button
              onClick={handleCreateClient}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Client
            </button>
          </div>
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
          searchTerm={searchTerm}
          isLoading={isLoading}
          onEditClient={handleEditClient}
          onClientDeleted={handleClientDeleted}
          onDuplicateClient={client => { setIsDuplicate(true); setEditingClient(client); setShowCreationModal(true); }}
        />
      </div>

      {error && <p role="alert" className="px-6 py-3 text-red-700">{error}</p>}
      {/* Creation/Edit Modal */}
      {showCreationModal && (
        <ClientsCreationModal
          client={editingClient}
          isDuplicate={isDuplicate}
          onClose={handleModalClose}
          onSave={handleClientSaved}
        />
      )}

      {showImportModal && (
        <ClientsImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => { void loadClients(); }}
        />
      )}
    </div>
  );
};

export default Clients;