import { useState } from 'react';
import type { ClientComment } from '../../../services/estimates/estimates.types';
import { MessageSquare, User, Send } from 'lucide-react';

interface ClientCommentSectionProps {
    estimateId: string;
    comments: ClientComment[];
    onAddComment: (text: string) => Promise<void>;
    clientName: string;
    clientEmail: string;
    onClientNameChange: (name: string) => void;
    onClientEmailChange: (email: string) => void;
}

export const ClientCommentSection = ({
    comments,
    onAddComment,
    clientName,
    clientEmail,
    onClientNameChange,
    onClientEmailChange
}: ClientCommentSectionProps) => {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !clientName || !clientEmail) return;

        setIsSubmitting(true);
        try {
            await onAddComment(newComment.trim());
            setNewComment('');
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments & Questions
            </h2>

            {/* Existing Comments */}
            {comments.length > 0 && (
                <div className="space-y-4 mb-6">
                    {comments.map((comment) => (
                        <div
                            key={comment.id}
                            className={`p-4 rounded-lg ${comment.isContractor
                                    ? 'bg-blue-50 border-l-4 border-blue-500'
                                    : 'bg-gray-50 border-l-4 border-gray-300'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full ${comment.isContractor ? 'bg-blue-100' : 'bg-gray-200'
                                    }`}>
                                    <User className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-900">
                                            {comment.authorName}
                                        </span>
                                        {comment.isContractor && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                Contractor
                                            </span>
                                        )}
                                        <span className="text-sm text-gray-500">
                                            {new Date(comment.date).toLocaleDateString()} at{' '}
                                            {new Date(comment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-wrap">{comment.text}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Client Info Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
                            Your Name *
                        </label>
                        <input
                            type="text"
                            id="clientName"
                            value={clientName}
                            onChange={(e) => onClientNameChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter your name"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-1">
                            Your Email *
                        </label>
                        <input
                            type="email"
                            id="clientEmail"
                            value={clientEmail}
                            onChange={(e) => onClientEmailChange(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter your email"
                            required
                        />
                    </div>
                </div>

                {/* Comment Text Area */}
                <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                        Add a comment or question
                    </label>
                    <textarea
                        id="comment"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        placeholder="Type your comment or question here..."
                        disabled={isSubmitting}
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim() || !clientName || !clientEmail}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Sending...' : 'Send Comment'}
                </button>
            </form>
        </div>
    );
};
