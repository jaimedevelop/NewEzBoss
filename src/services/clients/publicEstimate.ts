import { getEstimateByToken, trackEmailOpen } from '../estimates';
import type { EstimateWithId } from '../estimates/estimates.types';

/**
 * Resolves a public estimate email token to the estimate, for the
 * unauthenticated /client/estimate/:token view. Records the view on
 * first load.
 */
export const getPublicEstimate = async (token: string): Promise<EstimateWithId | null> => {
  const estimate = await getEstimateByToken(token);
  if (!estimate) return null;

  trackEmailOpen(token).catch(err => console.error('Error tracking estimate view:', err));

  return estimate;
};
