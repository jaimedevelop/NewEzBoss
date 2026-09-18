import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, CheckCircle2, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { getConnectStatus, getOnboardingLink, getManageLink, StripeConnectStatusResponse } from '../../../services/stripeConnect/stripeConnect';

const STATUS_LABELS: Record<StripeConnectStatusResponse['status'], string> = {
  not_connected: 'Not connected',
  onboarding: 'Onboarding in progress',
  active: 'Active',
  restricted: 'Restricted',
};

const PayoutsSection: React.FC = () => {
  const [status, setStatus] = useState<StripeConnectStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getConnectStatus();
      setStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payout status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connectRedirect = params.get('stripeConnect');
    if (connectRedirect) {
      params.delete('stripeConnect');
      const newSearch = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`);
      // Stripe sends users here when an Account Link expires. It cannot reuse
      // that one-time link, so immediately request and follow a fresh link.
      if (connectRedirect === 'refresh') {
        setIsConnecting(true);
        setError(null);
        void getOnboardingLink()
          .then((url) => { window.location.href = url; })
          .catch((err) => {
            setError(err instanceof Error ? err.message : 'Failed to refresh Stripe onboarding');
            setIsConnecting(false);
          });
      } else {
        loadStatus();
      }
    }
  }, [loadStatus]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const url = await getOnboardingLink();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start Stripe onboarding');
      setIsConnecting(false);
    }
  };

  const handleManage = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const url = await getManageLink();
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open Stripe account');
    } finally {
      setIsConnecting(false);
    }
  };

  const badgeClasses = (() => {
    if (!status) return 'bg-gray-100 text-gray-600';
    if (status.status === 'active') return 'bg-green-100 text-green-700';
    if (status.status === 'restricted') return 'bg-red-100 text-red-700';
    if (status.status === 'onboarding') return 'bg-amber-100 text-amber-700';
    return 'bg-gray-100 text-gray-600';
  })();

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-orange-600" />
          Payments & Payouts
        </h3>

        {isLoading ? (
          <div className="flex items-center text-gray-500 text-sm">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading payout status...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Connect Stripe to receive client payments. EzBoss transfers the payment to your connected Stripe balance after deducting the fee below. Bank payouts follow your Stripe payout schedule.
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  {status?.paymentPolicy
                    ? `Total card payment fee: ${status.paymentPolicy.basisPoints / 100}% + $${(status.paymentPolicy.fixedCents / 100).toFixed(2)} per successful payment, including each milestone payment. This includes payment processing; no additional EzBoss processing fee is added to the customer's invoice.`
                    : 'Payment pricing is unavailable. Refresh to review your fee before accepting online payments.'}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Full refunds return the full EzBoss fee; partial refunds return a proportional share, including the fixed component. EzBoss absorbs any Stripe processing fees that Stripe retains.
                </p>
                {status?.paymentPolicy && !status.paymentPolicy.creationEnabled && (
                  <p className="text-sm text-amber-700 mb-2">New online payments are temporarily paused. Existing payment reconciliation and refunds remain available.</p>
                )}
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${badgeClasses}`}>
                  {status?.status === 'active' && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                  {status?.status === 'restricted' && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                  {status ? STATUS_LABELS[status.status] : 'Unknown'}
                </span>
              </div>

              {status?.status === 'active' ? (
                <button
                  onClick={handleManage}
                  disabled={isConnecting}
                  className="bg-white text-orange-600 border border-orange-600 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors text-sm flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  <span>{isConnecting ? 'Redirecting...' : 'Manage on Stripe'}</span>
                </button>
              ) : (
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  <span>
                    {isConnecting
                      ? 'Redirecting...'
                      : status?.status === 'onboarding' || status?.status === 'restricted'
                        ? 'Continue Setup'
                        : 'Connect with Stripe'}
                  </span>
                </button>
              )}
            </div>

            {status && status.status !== 'not_connected' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div className="text-sm">
                  <span className="text-gray-500">Charges enabled:</span>{' '}
                  <span className="font-medium text-gray-900">{status.chargesEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Payouts enabled:</span>{' '}
                  <span className="font-medium text-gray-900">{status.payoutsEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Transfers enabled:</span>{' '}
                  <span className="font-medium text-gray-900">{status.transfersEnabled ? 'Yes' : 'No'}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center text-sm text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutsSection;
