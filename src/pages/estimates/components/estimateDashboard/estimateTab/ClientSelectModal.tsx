// src/pages/estimates/components/estimateDashboard/ClientSelectModal.tsx

import React, { useState, useEffect } from 'react';
import { X, Search, User, Loader2, Plus } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { getClients, type Client } from '../../../../../services/clients';
import ClientsCreationModal from '../../../../people/clients/components/ClientsCreationModal';

interface ClientSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectClient: (client: Client) => void;
}

const ClientSelectModal: React.FC<ClientSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectClient
}) => {
  const { currentUser } = useAuthContext();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadClients();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.companyName?.toLowerCase().includes(term)
      );
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const loadClients = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getClients(currentUser.uid);
      if (result.success && result.data) {
        setClients(result.data.clients || []);
        setFilteredClients(result.data.clients || []);
      } else {
        setError(result.error || 'Failed to load clients');
      }
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleClientCreated = () => {
    setShowCreateModal(false);
    loadClients(); // Reload the client list
  };

  const handleSelectClient = (client: Client) => {
    onSelectClient(client);
    onClose();
    setSearchTerm('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-900">Select Client</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search clients by name, email, or company..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {error}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600 mb-2">
                {searchTerm ? 'No clients found matching your search' : 'No clients yet'}
              </p>
              <p className="text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'Create a client in the Clients section first'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{client.name}</h3>
                      {client.companyName && (
                        <p className="text-sm text-gray-600 mt-0.5">{client.companyName}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <span>📧</span>
                            {client.email}
                          </span>
                        )}
                        {client.phoneMobile && (
                          <span className="flex items-center gap-1">
                            <span>📱</span>
                            {client.phoneMobile}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Client
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Client Creation Modal */}
      {showCreateModal && (
        <ClientsCreationModal
          client={null}
          onClose={() => setShowCreateModal(false)}
          onSave={handleClientCreated}
        />
      )}
    </div>
  );
};

export default ClientSelectModal;