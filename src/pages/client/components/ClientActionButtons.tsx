import React, { useState } from 'react';
import { Check, X, PauseCircle, Loader2 } from 'lucide-react';
import { updateEstimate } from '../../../services/estimates';
import { type Estimate } from '../../../services/estimates/estimates.types';

interface ClientActionButtonsProps {
  estimate: Estimate & { id: string };
  onUpdate: () => void;
}

const ClientActionButtons: React.FC<ClientActionButtonsProps> = ({ estimate, onUpdate }) => {
  const [loading, setLoading] = useState<'approve' | 'decline' | 'hold' | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [holdReason, setHoldReason] = useState('');

  const state = estimate.clientState;
  const isLocked = state === 'accepted' || state === 'declined';

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await updateEstimate(estimate.id, {
        clientState: 'accepted',
        clientApprovalDate: new Date().toISOString(),
      });
      onUpdate();
    } catch (err) {
      console.error('Error approving estimate:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) return;
    setLoading('decline');
    try {
      await updateEstimate(estimate.id, {
        clientState: 'declined',
        clientDeclineReason: declineReason.trim(),
        clientApprovalDate: new Date().toISOString(),
      });
      setShowDeclineModal(false);
      onUpdate();
    } catch (err) {
      console.error('Error declining estimate:', err);
    } finally {
      setLoading(null);
    }
  };

  const handleHold = async () => {
    setLoading('hold');
    try {
      await updateEstimate(estimate.id, {
        clientState: 'on-hold',
        onHoldDate: new Date().toISOString(),
        onHoldReason: holdReason.trim() || 'Client requested hold',
      });
      setShowHoldModal(false);
      onUpdate();
    } catch (err) {
      console.error('Error placing estimate on hold:', err);
    } finally {
      setLoading(null);
    }
  };

  if (isLocked) {
    return (
      <div className={`rounded-xl px-5 py-4 border text-sm font-medium flex items-center gap-2 ${
        state === 'accepted'
          ? 'bg-green-50 border-green-200 text-green-700'
          : 'bg-red-50 border-red-200 text-red-700'
      }`}>
        {state === 'accepted' ? (
          <><Check className="w-4 h-4" /> You approved this estimate</>
        ) : (
          <><X className="w-4 h-4" /> You declined this estimate</>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-gray-900">Your Decision</h3>

        <button
          onClick={() => setShowHoldModal(true)}
          disabled={loading !== null || state === 'on-hold'}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <PauseCircle className="w-4 h-4" />
          {state === 'on-hold' ? 'Currently On Hold' : 'Put on Hold'}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleApprove}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {loading === 'approve' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            Approve
          </button>

          <button
            onClick={() => setShowDeclineModal(true)}
            disabled={loading !== null}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <X className="w-4 h-4" />
            Decline
          </button>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Decline Estimate</h3>
            <p className="text-sm text-gray-500 mb-4">
              Please let us know why you're declining so we can improve.
            </p>
            <textarea
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Reason for declining…"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={!declineReason.trim() || loading === 'decline'}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading === 'decline' && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Put on Hold</h3>
            <p className="text-sm text-gray-500 mb-4">
              Optionally let us know why you're pausing your decision.
            </p>
            <textarea
              value={holdReason}
              onChange={e => setHoldReason(e.target.value)}
              placeholder="Reason (optional)…"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowHoldModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleHold}
                disabled={loading === 'hold'}
                className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading === 'hold' && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Hold
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ClientActionButtons;