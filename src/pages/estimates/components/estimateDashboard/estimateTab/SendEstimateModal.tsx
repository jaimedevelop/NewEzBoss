import { EzBossLoader } from '../../../../../mainComponents/ui/EzBossLoader';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X, Mail, Send, AlertTriangle } from 'lucide-react';
import { type Estimate } from '../../../../../services/estimates/estimates.types';
import { useAuthContext } from '../../../../../contexts/AuthContext';

interface SendEstimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  estimate: Estimate;
  onSend: (data: {
    recipientEmail: string; emailTitle: string;
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
  const [recipientEmail, setRecipientEmail] = useState(
    isInvoice && estimate.clientSnapshot?.billTo === 'company'
      ? estimate.clientSnapshot.invoiceEmail?.trim() || estimate.customerEmail || ''
      : estimate.customerEmail || ''
  );
  const recipientRef = useRef<HTMLInputElement>(null);
  const [ccEmails, setCcEmails] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [ccDraft, setCcDraft] = useState('');
  const [ccOpen, setCcOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const ccRef = useRef<HTMLInputElement>(null);
  const ccTriggerRef = useRef<HTMLButtonElement>(null);
  const snapshot = estimate.clientSnapshot;
  const contacts = snapshot?.billTo === 'company' ? [
    { name: snapshot.contactName || estimate.customerName, email: snapshot.email || estimate.customerEmail },
    ...(snapshot.additionalContacts || []),
    { name: 'Invoice email', email: snapshot.invoiceEmail },
    { name: snapshot.contactName || estimate.customerName, email: estimate.customerEmail },
  ].filter((contact, index, all) => {
    const email = contact.email?.trim().toLowerCase();
    return email && all.findIndex(item => item.email?.trim().toLowerCase() === email) === index;
  }).map(contact => ({ name: contact.name, email: contact.email!.trim() })) : [];
  const useContactDropdowns = contacts.length > 1;
  const splitEmails = (value: string) => value.split(',').map(email => email.trim()).filter(Boolean);
  const uniqueEmails = (emails: string[]) => emails.filter((email, index, all) => all.findIndex(item => item.toLowerCase() === email.toLowerCase()) === index);
  const selectedTo = splitEmails(recipientEmail);
  const selectedCc = splitEmails(ccEmails);
  const validEmails = (emails: string[]) => emails.every(email => email.length <= 320 && /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email));
  const commitDraft = (kind: 'to' | 'cc') => {
    const draft = kind === 'to' ? toDraft : ccDraft;
    const emails = splitEmails(draft);
    if (!validEmails(emails)) { setSendError('Enter valid email addresses separated by commas.'); return; }
    if (kind === 'to') {
      const next = uniqueEmails([...selectedTo, ...emails]);
      setRecipientEmail(next.join(', '));
      setCcEmails(selectedCc.filter(email => !next.some(to => to.toLowerCase() === email.toLowerCase())).join(', '));
      setToDraft('');
    } else {
      setCcEmails(uniqueEmails([...selectedCc, ...emails]).filter(email => !selectedTo.some(to => to.toLowerCase() === email.toLowerCase())).join(', '));
      setCcDraft('');
    }
    setSendError('');
  };

  const [message, setMessage] = useState(() => {
    const isBusinessInvoiceEmail = isInvoice
      && estimate.clientSnapshot?.billTo === 'company'
      && Boolean(estimate.clientSnapshot.invoiceEmail?.trim());
    const greeting = isBusinessInvoiceEmail
      ? ''
      : `Hi ${estimate.clientSnapshot?.billTo === 'company' ? estimate.clientSnapshot.contactName || estimate.customerName : estimate.customerName},\n\n`;
    const questions = isBusinessInvoiceEmail
      ? 'Let us know if there are any questions.'
      : 'Let us know if you have any questions.';
    return `${greeting}Please review ${title.toLowerCase()} ${documentNumber} using the secure link in this email.\n\n${questions}\n\nBest regards`;
  });
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
        else if (toOpen) { setToOpen(false); recipientRef.current?.focus(); }
        else if (ccOpen) { setCcOpen(false); ccTriggerRef.current?.focus(); }
        else onClose();
        return;
      }
      const activeDialog = showSendConfirmation ? confirmationRef.current : dialogRef.current;
      if (event.key !== 'Tab' || !activeDialog) return;
      const items = Array.from(activeDialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)'));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, sending, showSendConfirmation, toOpen, ccOpen, onClose]);

  const handleSend = async () => {
    setShowSendConfirmation(false);
    setSending(true);
    try {
      await onSend({
        recipientEmail: recipientEmail.trim(),
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
    const to = uniqueEmails([...selectedTo, ...splitEmails(toDraft)]);
    const cc = uniqueEmails([...selectedCc, ...splitEmails(ccDraft)]).filter(email => !to.some(item => item.toLowerCase() === email.toLowerCase()));
    if (!to.length || !validEmails([...to, ...cc])) { setSendError('Enter valid recipient email addresses.'); return; }
    if (to.length > 20 || cc.length > 20 || to.join(',').length > 1000 || cc.join(',').length > 1000) { setSendError('Use at most 20 addresses and 1000 characters per recipient field.'); return; }
    setRecipientEmail(to.join(', '));
    setCcEmails(cc.join(', '));
    setToDraft('');
    setCcDraft('');
    setToOpen(false);
    setCcOpen(false);
    setSendError('');
    setShowSendConfirmation(true);
  };

  const renderRecipients = (kind: 'to' | 'cc') => {
    const isTo = kind === 'to';
    const emails = isTo ? selectedTo : selectedCc;
    const draft = isTo ? toDraft : ccDraft;
    const setDraft = isTo ? setToDraft : setCcDraft;
    const setEmails = isTo ? setRecipientEmail : setCcEmails;
    const open = isTo ? toOpen : ccOpen;
    const setOpen = isTo ? setToOpen : setCcOpen;
    const id = isTo ? 'estimate-recipient-email' : 'estimate-cc-emails';
    return <div className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { commitDraft(kind); setOpen(false); } }}>
      <div className="flex items-center border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500">
        <div className="flex flex-1 min-w-0 flex-wrap items-center gap-1 p-2">
          {emails.map(email => <span key={email} className="inline-flex max-w-full items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-1 text-sm text-gray-800">
            <span className="min-w-0 break-all">{email}</span>
            <button type="button" disabled={sending} aria-label={`Remove ${email} from ${isTo ? 'To' : 'Cc'}`}
              onClick={() => setEmails(emails.filter(item => item !== email).join(', '))}
              className="shrink-0 rounded-full p-0.5 hover:bg-orange-100 focus:ring-2 focus:ring-orange-500"><X className="h-3 w-3" /></button>
          </span>)}
          <input ref={isTo ? recipientRef : ccRef} id={id} type="text" inputMode="email" autoCapitalize="none" autoComplete="off" spellCheck={false}
            value={draft} onChange={event => setDraft(event.target.value)} disabled={sending}
            onKeyDown={event => {
              if ((event.key === 'Enter' || event.key === ',') && !event.nativeEvent.isComposing) { event.preventDefault(); commitDraft(kind); }
              if (event.key === 'Backspace' && !draft) setEmails(emails.slice(0, -1).join(', '));
            }}
            className="flex-1 min-w-0 w-24 px-2 py-1 focus:outline-none" placeholder={emails.length ? 'Add email' : 'Enter email addresses'} />
        </div>
        {useContactDropdowns && <button ref={isTo ? undefined : ccTriggerRef} type="button" disabled={sending} aria-label={isTo ? 'Choose To contacts' : 'Choose Cc contacts'}
          aria-expanded={open} aria-controls={`estimate-${kind}-contacts`}
          onClick={() => { setOpen(value => !value); (isTo ? setCcOpen : setToOpen)(false); }}
          className="self-stretch px-3 rounded-r-lg hover:bg-gray-50 focus:ring-2 focus:ring-orange-500"><span aria-hidden="true">{open ? '▴' : '▾'}</span></button>}
      </div>
      {open && <div id={`estimate-${kind}-contacts`} role="group" aria-label={`${isTo ? 'To' : 'Cc'} recipients`} className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-y-auto border border-gray-300 rounded-lg bg-white p-2 shadow-lg">
        {contacts.map(contact => {
          const alreadyTo = !isTo && selectedTo.some(email => email.toLowerCase() === contact.email.toLowerCase());
          return <label key={contact.email} className={`flex items-start gap-3 rounded p-2 hover:bg-gray-50 ${alreadyTo ? 'opacity-50' : 'cursor-pointer'}`}>
            <input type="checkbox" className="mt-1 accent-orange-600" disabled={sending || alreadyTo}
              checked={emails.some(email => email.toLowerCase() === contact.email.toLowerCase())}
              onChange={event => {
                const next = event.target.checked ? uniqueEmails([...emails, contact.email]) : emails.filter(email => email.toLowerCase() !== contact.email.toLowerCase());
                setEmails(next.join(', '));
                if (isTo) setCcEmails(selectedCc.filter(email => !next.some(to => to.toLowerCase() === email.toLowerCase())).join(', '));
              }} />
            <span className="min-w-0 break-words text-sm">{contact.name && <span className="block font-medium">{contact.name}</span>}{contact.email}{alreadyTo && <span className="block text-xs">Selected as To recipient</span>}</span>
          </label>;
        })}
      </div>}
    </div>;
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
            <label htmlFor="estimate-recipient-email" className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            {renderRecipients('to')}
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
            <label htmlFor="estimate-cc-emails" className="block text-sm font-medium text-gray-700 mb-2">
              CC (optional)
            </label>
            {renderRecipients('cc')}
          </div>

          <p className="text-xs text-gray-500">Press Enter or comma to add an email address. Addresses entered here are used only for this email.</p>

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
              The recipient will receive an email with a secure link to view{!isInvoice && ` and ${estimate.estimateState === 'change-order' ? 'approve' : 'accept'}`} this {title.toLowerCase()} online.
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
            disabled={sending || (!recipientEmail.trim() && !toDraft.trim()) || !emailTitle.trim() || !message.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <EzBossLoader className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                <p id="send-confirmation-description" className="mt-2 text-sm text-gray-600">Are you sure you want to send this {title.toLowerCase()} to {recipientEmail.trim()}?{ccEmails.trim() && <span className="mt-2 block break-words">CC: {ccEmails.split(',').map(email => email.trim()).filter(Boolean).join(', ')}</span>}</p>
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
