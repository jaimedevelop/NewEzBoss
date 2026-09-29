import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, Mail, Send, AlertTriangle } from 'lucide-react';
import { type Estimate } from '../../../../services/estimates/estimates.types';
import { useAuthContext } from '../../../../../contexts/AuthContext';

interface SendEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  estimate: Estimate;
  onSend: (data: {
    emailTitle: string;
    ccEmails: string;
    message: string;
  }) => Promise<void>;
}

const SendEstimateModal: React.FC<SendEstimateModalProps> = ({
  isOpen,
  onClose,
  onBack,
  estimate,
  onSend
}) => {
  const { userProfile } = useAuthContext();
  const isInvoice = estimate.estimateState === 'invoice';
  const title = isInvoice ? 'Invoice' : estimate.estimateState === 'change-order' ? 'Change Order' : 'Estimate';
  const documentNumber = isInvoice ? estimate.invoiceNumber || 'Number pending' : estimate.estimateNumber;
  const companyName = userProfile?.company || 'Your Company';
  const [emailTitle, setEmailTitle] = useState(
    `${title} ${documentNumber} from ${companyName}`
  );
  const [ccEmails, setCcEmails] = useState('');
  const [message, setMessage] = useState(
    `Hi ${estimate.customerName},\n\nPlease review ${title.toLowerCase()} ${documentNumber} using the secure link in this email.\n\nLet us know if you have any questions.\n\nBest regards`
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  // Move focus only when opening or switching dialogs. Parent refreshes create
  // a new onClose callback and must not steal focus from an email field.
  useEffect(() => {
    if (!isOpen) return;
    (showSendConfirmation ? confirmationRef.current : dialogRef.current)?.focus();
  }, [isOpen, showSendConfirmation]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !sending) {
        if (showSendConfirmation) setShowSendConfirmation(false);
        else onClose();
        return;
      }
      const activeDialog = showSendConfirmation ? confirmationRef.current : dialogRef.current;
      if (event.key !== 'Tab' || !activeDialog) return;
      const items = Array.from(activeDialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled)'));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, sending, showSendConfirmation, onClose]);

  const handleSend = async () => {
    setShowSendConfirmation(false);
    setSending(true);
    try {
      await onSend({
        emailTitle,
        ccEmails,
        message
      });
      onClose();
    } catch (error) {
      console.error('Error sending estimate:', error);
      setSendError(error instanceof Error ? error.message : 'Unable to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const requestSendConfirmation = () => {
    setSendError('');
    setShowSendConfirmation(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="send-estimate-title" tabIndex={-1} className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col outline-none">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            {onBack && <button type="button" onClick={onBack} disabled={sending} aria-label="Back to sharing options" className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-50"><ArrowLeft className="w-5 h-5"/></button>}
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Mail className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 id="send-estimate-title" className="text-lg font-semibold text-gray-900">
                Send {title}
              </h2>
              <p className="text-sm text-gray-500">
                {documentNumber} to {estimate.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
              {estimate.customerEmail}
            </div>
          </div>

          {/* Email Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={emailTitle}
              onChange={(e) => setEmailTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Email subject line"
            />
          </div>

          {/* CC Emails */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CC (optional)
            </label>
            <input
              type="text"
              value={ccEmails}
              onChange={(e) => setCcEmails(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple emails with commas
            </p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Your message to the client..."
            />
          </div>

          {sendError && <p role="alert" className="text-sm text-red-700">{sendError}</p>}
          {/* Info Box */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              The client will receive an email with a secure link to view{!isInvoice && ` and ${estimate.estimateState === 'change-order' ? 'approve' : 'accept'}`} this {title.toLowerCase()} online.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          {onBack && <button
            onClick={onBack}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Back
          </button>}
          <button
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={requestSendConfirmation}
            disabled={sending || !emailTitle.trim() || !message.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send {title}
              </>
            )}
          </button>
        </div>
      </div>
      {showSendConfirmation && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !sending) setShowSendConfirmation(false); }}
        >
          <div ref={confirmationRef} role="alertdialog" aria-modal="true" aria-labelledby="send-confirmation-title" aria-describedby="send-confirmation-description" tabIndex={-1} className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl outline-none">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-orange-100 p-2 text-orange-600"><AlertTriangle className="h-5 w-5" /></div>
              <div>
                <h3 id="send-confirmation-title" className="text-lg font-semibold text-gray-900">Send {title}?</h3>
                <p id="send-confirmation-description" className="mt-2 text-sm text-gray-600">Are you sure you want to send this {title.toLowerCase()} to {estimate.customerEmail}?</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowSendConfirmation(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">Cancel</button>
              <button type="button" onClick={handleSend} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"><Send className="h-4 w-4" />Send {title}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SendEstimateModal;
