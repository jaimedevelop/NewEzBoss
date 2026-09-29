import { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { type Estimate } from '../../../services/estimates';
import { getClient, type Client } from '../../../services/clients';
import ClientsCreationModal from '../../people/clients/components/ClientsCreationModal';

type ClientValue = Pick<Estimate, 'customerId' | 'customerName' | 'customerEmail' | 'customerPhone' | 'serviceAddress' | 'serviceAddress2' | 'serviceCity' | 'serviceState' | 'serviceZipCode'>;

interface EstimateClientModalProps {
  value: ClientValue;
  readOnly?: boolean;
  onClose: () => void;
  onChangeClient: () => void;
  onSave: (client: Client) => Promise<boolean> | boolean;
}

/** Keeps estimate edits on the same full client form used by People. */
export default function EstimateClientModal({ value, readOnly = false, onClose, onChangeClient, onSave }: EstimateClientModalProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const loadClient = async () => {
      if (!value.customerId) {
        if (active) {
          setError('This estimate is not linked to a client. Select a client to edit its full details.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');
      const result = await getClient(value.customerId);
      if (!active) return;
      if (result.success && result.data) setClient(result.data);
      else setError(result.error || 'Unable to load this client.');
      setLoading(false);
    };

    void loadClient();
    return () => { active = false; };
  }, [value.customerId]);

  if (loading) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div role="dialog" aria-modal="true" className="flex items-center gap-3 rounded-lg bg-white px-6 py-5 shadow-xl">
        <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
        <span className="text-sm text-gray-700">Loading client…</span>
      </div>
    </div>;
  }

  if (client) {
    return <ClientsCreationModal
      client={client}
      readOnly={readOnly}
      onClose={onClose}
      onSave={async savedClient => {
        if (!savedClient || readOnly) { onClose(); return; }
        if (await onSave(savedClient)) onClose();
      }}
    />;
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div role="dialog" aria-modal="true" aria-labelledby="estimate-client-title" className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 id="estimate-client-title" className="text-xl font-bold text-gray-900">Edit Client</h2>
        <button type="button" aria-label="Close client details" onClick={onClose}><X className="h-6 w-6 text-gray-500" /></button>
      </div>
      <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">Cancel</button>
        {!readOnly && <button type="button" onClick={onChangeClient} className="rounded-lg bg-orange-600 px-4 py-2 text-sm text-white">Change Client</button>}
      </div>
    </div>
  </div>;
}
