import React, { useState } from 'react';
import { MessageSquare, Plus, Phone, Mail, MessageCircle, User, X } from 'lucide-react';
import { addCommunication } from '../../../../services/estimates';
import { useAuthContext } from '../../../../contexts/AuthContext';

interface CommunicationLogProps {
  estimate: {
    id?: string;
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
  const { currentUser, userProfile } = useAuthContext();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const communications = estimate.communications || [];

  const handleAddEntry = async () => {
    if (!newEntry.trim()) {
      setError('Communication entry cannot be empty');
      return;
    }

    if (!estimate.id) {
      setError('Estimate ID is missing');
      return;
    }

    if (!currentUser) {
      setError('You must be logged in to add communications');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const userName = userProfile?.name || currentUser.email || 'Unknown User';
      
      // addCommunication returns void, throws on error
      await addCommunication(
        estimate.id,
        newEntry.trim(),
        userName
      );

      // If we get here, it succeeded
      setNewEntry('');
      setShowAddForm(false);
      onUpdate(); // Refresh estimate data
    } catch (err) {
      console.error('Error adding communication:', err);
      setError(err instanceof Error ? err.message : 'Failed to add communication. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (communicationId: string) => {
    if (!estimate.id) {
      setError('Estimate ID is missing');
      return;
    }

    setDeletingId(communicationId);
    setError('');

    try {
      // Filter out the communication to delete
      const updatedCommunications = communications.filter(c => c.id !== communicationId);
      
      // Update the estimate with the filtered communications
      const { updateEstimate } = await import('../../../../services/estimates');
      const result = await updateEstimate(estimate.id, { 
        communications: updatedCommunications 
      });

      if (result.success) {
        onUpdate(); // Refresh estimate data
      } else {
        setError('Failed to delete communication');
      }
    } catch (err) {
      console.error('Error deleting communication:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete communication. Please try again.');
    } finally {
      setDeletingId(null);
    }
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
            disabled={isSubmitting}
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
              onChange={(e) => {
                setNewEntry(e.target.value);
                setError(''); // Clear error when user types
              }}
              placeholder="Example: 11/22/25: Spoke with Jaime about upgrading fixtures..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            
            {/* Error Message */}
            {error && (
              <div className="mt-2 text-xs text-red-600">
                {error}
              </div>
            )}

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
                    setError('');
                  }}
                  disabled={isSubmitting}
                  className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  disabled={isSubmitting || !newEntry.trim()}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Adding...' : 'Add Entry'}
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
            {communications.map((comm) => (
              <div
                key={comm.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200 relative group"
              >
                {/* Delete button - shows on hover */}
                <button
                  onClick={() => handleDeleteEntry(comm.id)}
                  disabled={deletingId === comm.id}
                  className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete entry"
                >
                  {deletingId === comm.id ? (
                    <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </button>

                <div className="flex items-start gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0 pr-6">
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