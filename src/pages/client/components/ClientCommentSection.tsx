import React, { useState } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { addClientComment } from '../../../services/estimates';
import { type Estimate, type ClientComment } from '../../../services/estimates/estimates.types';
import { type ClientUser } from '../../../services/clients/client.auth';

interface ClientCommentSectionProps {
  estimate: Estimate & { id: string };
  clientUser: ClientUser;
  onUpdate: () => void;
}

const ClientCommentSection: React.FC<ClientCommentSectionProps> = ({
  estimate,
  clientUser,
  onUpdate
}) => {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const comments: ClientComment[] = estimate.clientComments ?? [];

  const formatTime = (ts: any): string => {
    try {
      const d = ts?.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      await addClientComment(estimate.id, {
        content: message.trim(),
        authorName: clientUser.name,
        authorEmail: clientUser.email,
        isContractor: false,
      });
      setMessage('');
      onUpdate();
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Thread */}
      {comments.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No messages yet. Start the conversation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c, i) => {
            const isContractor = c.isContractor;
            return (
              <div
                key={i}
                className={`rounded-xl px-4 py-3 border-l-4 ${
                  isContractor
                    ? 'bg-blue-50 border-blue-400'
                    : 'bg-gray-50 border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">{c.authorName}</span>
                  {isContractor && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      Contractor
                    </span>
                  )}
                  <span className="text-xs text-gray-400 ml-auto">{formatTime(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Compose */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <div className="space-y-2">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message or question… (Ctrl+Enter to send)"
          rows={3}
          className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!message.trim() || submitting}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send Message
        </button>
      </div>
    </div>
  );
};

export default ClientCommentSection;