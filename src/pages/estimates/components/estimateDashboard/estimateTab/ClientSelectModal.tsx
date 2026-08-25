// src/pages/estimates/components/estimateDashboard/ClientSelectModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, User, Loader2, Plus, Upload } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { getClients, type Client } from '../../../../../services/clients';
import ClientsCreationModal from '../../../../people/clients/components/ClientsCreationModal';
import ClientsImportModal from '../../../../people/clients/components/ClientsImportModal';

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
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadClients();
    }
  }, [isOpen, currentUser]);

  useEffect(() => {
    let result = clients;

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(client =>
        client.name.toLowerCase().includes(term) ||
        client.email?.toLowerCase().includes(term) ||
        client.companyName?.toLowerCase().includes(term)
      );
    }

    if (activeLetter) {
      result = result.filter(client =>
        client.name.toUpperCase().startsWith(activeLetter)
      );
    }

    setFilteredClients(result);
  }, [searchTerm, activeLetter, clients]);

  const ALPHABET = useMemo(() => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''), []);

  const loadClients = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    const pageSize = 200;

    try {
      // First page: render as soon as this lands so the list feels instant.
      const firstResult = await getClients(currentUser.uid, undefined, pageSize, 0);
      if (!firstResult.success || !firstResult.data) {
        setError(firstResult.error || 'Failed to load clients');
        setLoading(false);
        return;
      }

      const allClients: Client[] = [...(firstResult.data.clients || [])];
      setClients([...allClients]);
      setLoading(false);

      const { hasMore, totalCount } = firstResult.data;

      if (hasMore) {
        setLoadingMore(true);
        if (typeof totalCount === 'number') {
          // We know exactly how many pages remain — fetch them all in parallel.
          const remainingOffsets: number[] = [];
          for (let offset = pageSize; offset < totalCount; offset += pageSize) {
            remainingOffsets.push(offset);
          }
          const results = await Promise.all(
            remainingOffsets.map(offset => getClients(currentUser.uid, undefined, pageSize, offset))
          );
          for (const result of results) {
            if (!result.success || !result.data) {
              setError(result.error || 'Failed to load clients');
              return;
            }
            allClients.push(...(result.data.clients || []));
          }
          setClients([...allClients]);
        } else {
          // No total count available — fall back to sequential fetching.
          let more = hasMore;
          let offset = pageSize;
          while (more) {
            const result = await getClients(currentUser.uid, undefined, pageSize, offset);
            if (!result.success || !result.data) {
              setError(result.error || 'Failed to load clients');
              return;
            }
            allClients.push(...(result.data.clients || []));
            more = result.data.hasMore;
            offset += pageSize;
            setClients([...allClients]);
          }
        }
      }
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Failed to load clients');
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
        <div className="flex-1 flex overflow-hidden">
          {/* Alphabet Sidebar */}
          <div className="w-12 bg-white border-r border-gray-200 overflow-y-auto flex-shrink-0">
            <button
              onClick={() => setActiveLetter(null)}
              className={`w-full py-2 text-xs font-semibold transition-colors ${activeLetter === null
                ? 'bg-orange-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              All
            </button>
            {ALPHABET.map(letter => (
              <button
                key={letter}
                onClick={() => setActiveLetter(letter)}
                className={`w-full py-2 text-sm font-semibold transition-colors ${activeLetter === letter
                  ? 'bg-orange-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                {letter}
              </button>
            ))}
          </div>

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
                {loadingMore ? (
                  <>
                    <Loader2 className="w-8 h-8 mx-auto mb-3 text-orange-600 animate-spin" />
                    <p className="text-gray-600">Loading...</p>
                  </>
                ) : (
                  <>
                    <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-gray-600 mb-2">
                      {activeLetter
                        ? `Empty. Clients starting with "${activeLetter}" will display here.`
                        : searchTerm
                          ? 'No clients found matching your search'
                          : 'No clients yet'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {activeLetter
                        ? 'Try a different letter or clear the filter'
                        : searchTerm
                          ? 'Try a different search term'
                          : 'Create a client in the Clients section first'}
                    </p>
                  </>
                )}
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
            onClick={() => setShowImportModal(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Clients
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

      {/* Client Import Modal */}
      {showImportModal && (
        <ClientsImportModal
          onClose={() => setShowImportModal(false)}
          onImported={() => {
            setShowImportModal(false);
            loadClients();
          }}
        />
      )}
    </div>
  );
};

export default ClientSelectModal;