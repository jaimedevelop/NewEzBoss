import React, { useState } from 'react';
import { MessageSquare, Plus, Phone, Mail, MessageCircle, User, X, Reply, Send } from 'lucide-react';
import { addCommunication, addClientComment, type ClientComment } from '../../../../../services/estimates';
import { useAuthContext } from '../../../../../contexts/AuthContext';

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
    clientComments?: ClientComment[];
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

  // For replying to client messages
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const communications = (estimate.communications || []).map(c => ({
    ...c,
    type: 'internal' as const,
    text: c.content,
    author: c.createdBy,
    isClient: false,
    isContractorComment: false
  }));

  const clientComments = (estimate.clientComments || []).map(c => ({
    id: c.id,
    date: c.date,
    text: c.text,
    author: c.authorName,
    type: 'client-comment' as const,
    isClient: !c.isContractor,
    isContractorComment: c.isContractor
  }));

  // Combine and sort by date descending
  const allLogs = [...communications, ...clientComments].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

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

      await addCommunication(
        estimate.id,
        newEntry.trim(),
        userName
      );

      setNewEntry('');
      setShowAddForm(false);
      onUpdate();
    } catch (err) {
      console.error('Error adding communication:', err);
      setError(err instanceof Error ? err.message : 'Failed to add communication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !estimate.id) return;

    setIsSubmitting(true);
    try {
      const userName = userProfile?.name || currentUser?.email || 'Contractor';
      const userEmail = currentUser?.email || 'unknown';

      await addClientComment(estimate.id, {
        text: replyText.trim(),
        authorName: userName,
        authorEmail: userEmail,
        isContractor: true
      });

      setReplyText('');
      setReplyToId(null);
      onUpdate();
    } catch (err) {
      console.error('Error sending reply:', err);
      setError('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string, type: 'internal' | 'client-comment') => {
    if (!estimate.id) return;

    setDeletingId(id);
    setError('');

    try {
      const { updateEstimate } = await import('../../../../../services/estimates');

      if (type === 'internal') {
        const updated = (estimate.communications || []).filter(c => c.id !== id);
        await updateEstimate(estimate.id, { communications: updated });
      } else {
        const updated = (estimate.clientComments || []).filter(c => c.id !== id);
        await updateEstimate(estimate.id, { clientComments: updated });
      }

      onUpdate();
    } catch (err) {
      console.error('Error deleting entry:', err);
      setError('Failed to delete entry');
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
          Track all interactions including client comments
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
                setError('');
              }}
              placeholder="Example: Spoke with customer about the layout..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
              rows={3}
              disabled={isSubmitting}
            />

            {error && <div className="mt-2 text-xs text-red-600">{error}</div>}

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Phone className="w-3 h-3" />
                <Mail className="w-3 h-3" />
                <span>Internal notes only</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setNewEntry('');
                    setShowAddForm(false);
                    setError('');
                  }}
                  disabled={isSubmitting}
                  className="px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  disabled={isSubmitting || !newEntry.trim()}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                >
                  {isSubmitting ? 'Adding...' : 'Add Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unified List */}
        {allLogs.length === 0 ? (
          <div className="text-center py-6">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No history yet</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {allLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-lg border relative group transition-all ${log.isClient
                    ? 'bg-blue-50 border-blue-100 ml-4'
                    : log.isContractorComment
                      ? 'bg-gray-50 border-gray-200 ml-4'
                      : 'bg-white border-gray-200'
                  }`}
              >
                {/* Type Badge */}
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${log.isClient
                      ? 'bg-blue-100 text-blue-700'
                      : log.isContractorComment
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-green-100 text-green-700'
                    }`}>
                    {log.isClient ? 'Client' : log.isContractorComment ? 'Response' : 'Internal'}
                  </span>

                  <button
                    onClick={() => handleDeleteEntry(log.id, log.type)}
                    disabled={deletingId === log.id}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-start gap-2 mb-1">
                  <User className={`w-4 h-4 mt-0.5 ${log.isClient ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="flex-1 pr-16">
                    <p className="text-xs font-semibold text-gray-900">
                      {log.author}
                    </p>
                    <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                      {log.text}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 ml-6">
                  <p className="text-[10px] text-gray-400">
                    {new Date(log.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  </p>

                  {log.isClient && (
                    <button
                      onClick={() => {
                        setReplyToId(replyToId === log.id ? null : log.id);
                        setReplyText('');
                      }}
                      className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Reply className="w-3 h-3" />
                      {replyToId === log.id ? 'Cancel' : 'Respond'}
                    </button>
                  )}
                </div>

                {/* Reply Form */}
                {replyToId === log.id && (
                  <div className="mt-3 p-2 bg-white rounded border border-blue-100">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response to the client..."
                      className="w-full p-2 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || isSubmitting}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-[10px] font-medium rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        {isSubmitting ? 'Sending...' : 'Send Response'}
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1">
                      This response will be visible to the client in their estimate view.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="w-3 h-3 text-blue-600" />
              <p className="text-xs font-medium text-blue-900">Direct Messaging</p>
            </div>
            <p className="text-[11px] text-blue-700">
              Messages marked as <span className="font-bold underline">Client</span> come directly from the estimate's comment section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunicationLog;