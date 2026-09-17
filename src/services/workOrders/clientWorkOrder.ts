import { clientAuthRequest } from '../clients/client.auth';
import { estimatesPublicApiRequest } from '../estimates/estimatesApi';

export interface ClientWorkOrderTask {
  id: string;
  name: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string | null;
  laborItemId?: string | null;
  laborItemName?: string | null;
}

export interface ClientWorkOrderProgress {
  id: string;
  woNumber?: string;
  status?: string;
  tasks: ClientWorkOrderTask[];
}

export async function getClientWorkOrderProgress(
  estimateId: string,
): Promise<ClientWorkOrderProgress | null> {
  try {
    return await clientAuthRequest<ClientWorkOrderProgress>(
      `/clientPortal/estimates/${encodeURIComponent(estimateId)}/work-order`,
    );
  } catch (error) {
    console.error('Error loading client work order progress:', error);
    return null;
  }
}

export async function getPublicWorkOrderProgress(
  token: string,
): Promise<ClientWorkOrderProgress | null> {
  try {
    return await estimatesPublicApiRequest<ClientWorkOrderProgress>(
      `/estimates/public/by-token/${encodeURIComponent(token)}/work-order`,
    );
  } catch (error) {
    console.error('Error loading public work order progress:', error);
    return null;
  }
}
