import { estimatesApiRequest } from '../../services/estimates/estimatesApi';

// The API derives the account from the authenticated session and timestamps the open.
export async function recordOpenedEstimate(estimateId: string): Promise<void> {
  await estimatesApiRequest(`/estimates/${encodeURIComponent(estimateId)}/opened`, {
    method: 'POST',
  });
}
