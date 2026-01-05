// src/pages/clients/components/ClientsList.tsx

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Edit2, Trash2, Building2 } from 'lucide-react';
import { deleteClient, formatPhoneNumber, type Client } from '../../../services/clients';

interface ClientsListProps {
  clientsGrouped: Record<string, Client[]>;
  isLoading: boolean;
  onEditClient: (client: Client) => void;
  onClientDeleted: () => void;
}

const ClientsList: React.FC<ClientsListProps> = ({
  clientsGrouped,
  isLoading,
  onEditClient,
  onClientDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const letters = Object.keys(clientsGrouped).sort();

  // Set initial active tab
  React.useEffect(() => {
    if (letters.length > 0 && !activeTab) {
      setActiveTab(letters[0]);
    }
  }, [letters, activeTab]);

  const handleDelete = async (clientId: string, clientName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${clientName}?`)) {
      return;
    }

    setDeletingId(clientId);
    const result = await deleteClient(clientId);

    if (result.success) {
      onClientDeleted();
    } else {
      alert('Failed to delete client');
    }
    setDeletingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading clients...</div>
      </div>
    );
  }

  if (letters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No clients found</p>
          <p className="text-gray-400 text-sm mt-2">Click "Add Client" to create your first client</p>
        </div>
      </div>
    );
  }

  const activeClients = clientsGrouped[activeTab] || [];

  return (
    <div className="flex h-full">
      {/* Alphabetical Tabs */}
      <div className="w-12 bg-white border-r border-gray-200 overflow-y-auto">
        {letters.map(letter => (
          <button
            key={letter}
            onClick={() => setActiveTab(letter)}
            className={`w-full py-2 text-sm font-semibold transition-colors ${
              activeTab === letter
                ? 'bg-orange-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Clients List */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {activeClients.map(client => (
            <div
              key={client.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Name and Company */}
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {client.name}
                    </h3>
                    {client.companyName && (
                      <span className="flex items-center gap-1 text-sm text-gray-500">
                        <Building2 className="w-4 h-4" />
                        {client.companyName}
                      </span>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${client.email}`} className="hover:text-orange-600">
                        {client.email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${client.phoneMobile}`} className="hover:text-orange-600">
                        {formatPhoneNumber(client.phoneMobile)}
                      </a>
                      {client.phoneOther && (
                        <span className="text-gray-400">
                          • {formatPhoneNumber(client.phoneOther)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {client.billingAddress}, {client.billingCity}, {client.billingState} {client.billingZipCode}
                      </span>
                    </div>
                  </div>

                  {/* Client Type */}
                  {client.clientType && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded">
                        {client.clientType}
                      </span>
                    </div>
                  )}

                  {/* Notes */}
                  {client.notes && (
                    <p className="mt-2 text-sm text-gray-500 italic">
                      {client.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onEditClient(client)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                    title="Edit client"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id!, client.name)}
                    disabled={deletingId === client.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete client"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ClientsList;