import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Combobox } from '../../../../mainComponents/forms/Combobox';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { estimatesApiRequest, DOCUMENTS_UPDATED_EVENT, getDocumentsRevision } from '../../../../services/estimates/estimatesApi';
import { getClientsGroupedByLetter, type Client } from '../../../../services/clients';
import { address, formatDate, invoiceBalance, money, selectDocuments, type DocumentRow, type Period } from './documents';
import DocumentNotice from './DocumentNotice';

type CachedData = { identity: string; rows: DocumentRow[]; clients: Client[]; billingUnavailable: boolean };
const cache = new Map<string, { revision: number; request: Promise<CachedData> }>();

export default function RecentDocuments() {
    const { currentUser, userProfile, isLoading, isAuthenticated, canAccessPage } = useAuthContext();
    const permitted = isAuthenticated && canAccessPage('estimates');
    const clientsPermitted = isAuthenticated && canAccessPage('clients');
    const identity = currentUser?.uid;
    const [period, setPeriod] = useState<Period>('Last 7 days');
    const [data, setData] = useState<CachedData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [retry, setRetry] = useState(0);
    const [now, setNow] = useState(() => new Date());
    const filterId = useId();
    useEffect(() => {
      const update = () => setRetry(value => value + 1);
      window.addEventListener(DOCUMENTS_UPDATED_EVENT, update);
      return () => window.removeEventListener(DOCUMENTS_UPDATED_EVENT, update);
    }, []);

    useEffect(() => {
      const timer = window.setInterval(() => setNow(new Date()), 60_000);
      return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
      let active = true;
      setData(null);
      setError(null);
      if (isLoading || !permitted || !identity) return () => { active = false; };
      setLoading(true);
      const key = `${identity}:${clientsPermitted}`;
      const revision = getDocumentsRevision();
      let entry = cache.get(key);
      if (!entry || entry.revision !== revision) {
        const request = (async () => {
          const [rows, clients] = await Promise.all([
            estimatesApiRequest<DocumentRow[]>('/estimates'),
            clientsPermitted ? getClientsGroupedByLetter(identity).catch(() => null) : Promise.resolve(null),
          ]);
          if (!Array.isArray(rows)) throw new Error('Invalid document response');
          return { identity, rows, clients: clients?.success && clients.data ? Object.values(clients.data).flat() : [],
            billingUnavailable: !clients?.success || !clients.data };
        })();
        entry = { revision, request };
        cache.set(key, entry);
      }
      const pending = entry;
      void pending.request.then(result => {
        if (active) setData(result);
      }).catch(() => {
        if (cache.get(key) === pending) cache.delete(key);
        if (active) setError('Unable to load recent documents. Please try again.');
      }).finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [isLoading, permitted, clientsPermitted, identity, retry]);

    // Do not render another session's rows while an effect is clearing state.
    const visibleData = data?.identity === identity ? data : null;
    const busy = isLoading || (permitted && (loading || (!visibleData && !error)));
    const selections = {
      estimates: selectDocuments(visibleData?.rows ?? [], 'estimates', period, now, userProfile?.timezone),
      invoices: selectDocuments(visibleData?.rows ?? [], 'invoices', period, now, userProfile?.timezone),
    };
    const notices = (kind: 'estimates' | 'invoices') => {
      if (busy || !permitted || error) return [];
      const selection = selections[kind];
      const documentLinks = (documents: DocumentRow[]) => <> ({documents.map((document, index) => {
        const number = kind === 'invoices' ? document.invoiceNumber || document.estimateNumber : document.estimateNumber;
        return <span key={document.id}>{index > 0 && ', '}<Link to={`/estimates/${document.id}`}
          className="text-orange-700 underline hover:text-orange-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600">{number || 'View document'}</Link></span>;
      })})</>;
      return [
        ...(selection.unsent > 0 ? [<>{selection.unsent} issued {selection.unsent === 1 ? kind.slice(0, -1) : kind} {selection.unsent === 1 ? 'has' : 'have'} not been sent yet{documentLinks(selection.unsentDocuments)}.</>] : []),
        ...(selection.unavailable > 0 ? [<>Across all {kind}, {selection.unavailable} sent documents have missing timestamps; their range is unknown{documentLinks(selection.unavailableDocuments)}.</>] : []),
      ];
    };

    return <section aria-label="Recent estimates and invoices" className="min-w-0 h-full">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="grid rounded-t-xl border-b border-orange-500 bg-gradient-to-r from-orange-500 to-orange-600 md:grid-cols-2 md:divide-x md:divide-orange-400">
        <div className="flex items-center gap-2 px-4 py-2 sm:px-6">
          <h2 className="text-base font-semibold text-white">Estimates</h2>
          <DocumentNotice title="Estimates" messages={notices('estimates')} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-white">Invoices</h2>
            <DocumentNotice title="Invoices" messages={notices('invoices')} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div aria-labelledby={filterId} role="group" className="w-36">
              <Combobox
                color="orange"
                appearance="outlined"
                searchable={false}
                value={period}
                onChange={value => setPeriod(value as Period)}
                options={(['Last 7 days', 'Last 30 days', 'Last 90 days'] as const).map(value => ({ value, label: value }))}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="grid min-w-0 divide-y divide-gray-200 md:grid-cols-2 md:divide-x md:divide-y-0">
      {(['estimates', 'invoices'] as const).map(kind => {
        const title = kind === 'estimates' ? 'Recent Estimates' : 'Recent Invoices';
        const selection = selections[kind];
        return <section key={kind} aria-label={title} className="min-w-0">
      <div className="p-4 sm:p-6" aria-busy={busy}>
        {busy ? <p role="status" className="py-8 text-center text-gray-500">Loading {kind}…</p>
          : !permitted ? <p role="status" className="py-8 text-gray-500">{title} unavailable. Estimate access is required.</p>
          : error ? <div role="alert" className="space-y-3 text-red-700"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="rounded border border-red-300 px-3 py-2 text-sm">Try again</button></div>
          : <>
            {selection.documents.length === 0 ? <p role="status" className="py-6 text-gray-500">No sent {kind} with known timestamps in the {period.toLowerCase()}.</p>
              : <ul className="space-y-4">
                {selection.documents.map(document => {
                  const client = visibleData?.clients.find(value => value.id === String(document.customerId));
                  const balance = kind === 'invoices' ? invoiceBalance(document, visibleData?.rows ?? []) : null;
                  const status = kind === 'estimates' ? (document.clientState === 'accepted' ? 'Approved' : document.clientState === 'denied' ? 'Denied' : 'Sent') : balance == null ? 'Payment status unavailable' : balance === 0 ? 'Paid' : 'Unpaid';
                  const number = kind === 'invoices' ? document.invoiceNumber || document.estimateNumber : document.estimateNumber;
                  const billing = client ? address([client.billingAddress, client.billingAddress2, client.billingCity, client.billingState, client.billingZipCode]) : 'Unavailable';
                  return <li key={document.id} className="min-w-0">
                    <Link to={`/estimates/${document.id}`} className="group relative block rounded-lg bg-gray-50 p-4 transition-colors hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="min-w-0 break-words font-semibold text-orange-700">{number || 'Document number unavailable'}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${status === 'Approved' || status === 'Paid' ? 'bg-green-100 text-green-800' : status === 'Denied' ? 'bg-red-100 text-red-800' : 'bg-gray-200 text-gray-700'}`}>{status}</span>
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">Client Name</p>
                        <p className="mt-1 break-words font-medium text-gray-900">{document.customerName?.trim() || client?.name?.trim() || 'Client name unavailable'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-gray-500">{kind === 'invoices' ? 'Amount owed' : 'Selling price'}</p>
                        <p className="mt-1 font-semibold text-gray-900">{kind === 'invoices' ? balance == null ? 'Unavailable' : money(balance, userProfile?.currency) : document.total == null || document.total === '' || !Number.isFinite(Number(document.total)) ? 'Unavailable' : money(Number(document.total), userProfile?.currency)}</p>
                      </div>
                    </div>
                    <dl className="absolute left-0 right-0 top-full z-20 hidden space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-lg group-hover:block group-focus:block">
                      <div className="flex flex-wrap items-baseline gap-x-2"><dt className="shrink-0 text-gray-500">Sent</dt><dd className="max-w-full">{formatDate(document.sentDate, userProfile?.timezone)}</dd></div>
                      <div className="flex flex-wrap items-baseline gap-x-2"><dt className="shrink-0 text-gray-500">Expiration</dt><dd className="max-w-full">{document.validUntil ? formatDate(document.validUntil, userProfile?.timezone) : 'No expiration'}</dd></div>
                      <div className="flex flex-wrap items-baseline gap-x-2"><dt className="shrink-0 text-gray-500">Service address</dt><dd className="max-w-full whitespace-normal [overflow-wrap:anywhere]">{address([document.serviceAddress, document.serviceAddress2, document.serviceCity, document.serviceState, document.serviceZipCode])}</dd></div>
                      <div className="flex flex-wrap items-baseline gap-x-2"><dt className="shrink-0 text-gray-500">Billing address</dt><dd className="max-w-full whitespace-normal [overflow-wrap:anywhere]">{billing}</dd></div>
                    </dl>
                    </Link>
                  </li>;
                })}
              </ul>}
            {visibleData?.billingUnavailable && selection.documents.length > 0 && <p className="mt-4 text-sm text-gray-500">Billing addresses unavailable: linked client data could not be accessed.</p>}
          </>}
        {permitted && <div className="mt-5 flex justify-end">
          <Link to={`/estimates?type=${kind === 'estimates' ? 'estimate' : 'invoice'}`} aria-label={`View all ${kind}`} className="inline-flex items-center justify-center rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-orange-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">View all</Link>
        </div>}
      </div>
      </section>;
      })}
      </div>
      </div>
    </section>;
}
