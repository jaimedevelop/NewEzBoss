import { useMemo } from 'react';
import { type Estimate } from '../../../services/estimates';
import { type Client } from '../../../services/clients';
import ClientsCreationModal from '../../people/clients/components/ClientsCreationModal';

type ClientValue = Pick<Estimate, 'clientSnapshot' | 'customerId' | 'customerName' | 'customerEmail' | 'customerPhone' | 'serviceAddress' | 'serviceAddress2' | 'serviceCity' | 'serviceState' | 'serviceZipCode'>;

interface EstimateClientModalProps {
  value: ClientValue;
  readOnly?: boolean;
  onClose: () => void;
  onChangeClient: () => void;
  onSave: (client: Client) => Promise<boolean> | boolean;
}

const addressesMatch = (client: Pick<Client,
  'billingAddress' | 'billingAddress2' | 'billingCity' | 'billingState' | 'billingZipCode' |
  'serviceAddress' | 'serviceAddress2' | 'serviceCity' | 'serviceState' | 'serviceZipCode'
>) => (
  client.serviceAddress === client.billingAddress &&
  client.serviceAddress2 === client.billingAddress2 &&
  client.serviceCity === client.billingCity &&
  client.serviceState === client.billingState &&
  client.serviceZipCode === client.billingZipCode
);

/** Edit the estimate-owned snapshot using the client form shared with People. */
export default function EstimateClientModal({ value, readOnly = false, onClose, onChangeClient, onSave }: EstimateClientModalProps) {
  const clientForEstimate = useMemo(() => {
    const snapshot = {
      ...value.clientSnapshot,
      id: value.customerId,
      userId: value.clientSnapshot?.userId || '',
      name: value.customerName,
      email: value.customerEmail,
      phoneMobile: value.customerPhone || '',
      serviceAddress: value.serviceAddress || '',
      serviceAddress2: value.serviceAddress2 || '',
      serviceCity: value.serviceCity || '',
      serviceState: value.serviceState || '',
      serviceZipCode: value.serviceZipCode || '',
    };
    return { ...snapshot, billingEqualToService: addressesMatch(snapshot) };
  }, [value]);

  {
    // Service addresses belong to estimates, not to the shared client record:
    // a client can have multiple estimates at different locations.
    return <ClientsCreationModal
      client={clientForEstimate}
      readOnly={readOnly}
      persistServiceAddress={false}
      snapshotOnly
      onClose={onClose}
      onChangeClient={onChangeClient}
      onSave={async savedClient => {
        if (!savedClient || readOnly) { onClose(); return; }
        // Service addresses live on estimates in this workflow. If the user
        // says they match, save the billing address as the estimate address
        // instead of carrying forward the previous service address.
        const clientForSave = savedClient.billingEqualToService
          ? {
              ...savedClient,
              serviceAddress: savedClient.billingAddress,
              serviceAddress2: savedClient.billingAddress2,
              serviceCity: savedClient.billingCity,
              serviceState: savedClient.billingState,
              serviceZipCode: savedClient.billingZipCode,
            }
          : savedClient;
        if (await onSave(clientForSave)) onClose();
      }}
    />;
  }

}
