import React, { useState } from 'react';
import { MessageSquare, Plus, Phone, Mail, MessageCircle, User } from 'lucide-react';

interface CommunicationLogProps {
  estimate: {
    estimateNumber: string;
    communications?: Array<{
      id: string;
      date: string;
      content: string;
      createdBy: string;
    }>;
  };
  onUpdate: () => void;
}

const CommunicationLog: React.FC<CommunicationLogProps> = ({ estimate, onUpdate }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState('');

  const communications = estimate.communications || [];

  const handleAddEntry = async () => {
    if (!newEntry.trim()) return;

    // TODO: Save to Firebase
    console.log('Adding communication:', newEntry);
    
    setNewEntry('');
    setShowAddForm(false);
    onUpdate();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            <h3 className="text-base font-semibold text-gray-900">Communication Log</h3>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
            title="Add entry"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Track all customer interactions
        </p>
      </div>

      <div className="p-4">
        {/* Add Entry Form */}
        {showAddForm && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <textarea
              value={newEntry}
              onChange={(e) => setNewEntry(e.target.value)}
              placeholder="Example: 11/22/25: Spoke with Jaime about upgrading fixtures..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Phone className="w-3 h-3" />
                <Mail className="w-3 h-3" />
                <MessageCircle className="w-3 h-3" />
                <span>Tip: Include date, method, and key points</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setNewEntry('');
                    setShowAddForm(false);
                  }}
                  className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                >
                  Add Entry
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Communications List */}
        {communications.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500 mb-3">
              No communication history yet
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="text-xs text-green-600 hover:text-green-700 font-medium"
            >
              Add first entry →
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {communications.map((comm, index) => (
              <div
                key={comm.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-start gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 mb-1">
                      {comm.createdBy}
                    </p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap break-words">
                      {comm.content}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 ml-6">
                  {new Date(comm.date).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Future Integration Notice */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-900 mb-1">
              Future Integration
            </p>
            <p className="text-xs text-blue-700">
              Will automatically log emails and phone calls
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationLog;