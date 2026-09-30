import { getEstimateByToken, trackEmailOpen } from '../estimates';
import type { EstimateWithId } from '../estimates/estimates.types';

/**
 * Load an emailed or shared estimate link. Count page visits by default;
 * background refreshes after customer actions must opt out.
 */
export const getPublicEstimate = async (
  token: string,
  { recordView = true }: { recordView?: boolean } = {},
): Promise<EstimateWithId | null> => {
  const estimate = await getEstimateByToken(token);
  if (!estimate) return null;

  if (recordView) {
    void trackEmailOpen(token).catch(err => console.error('Error tracking estimate view:', err));
  }

  return estimate;
};
