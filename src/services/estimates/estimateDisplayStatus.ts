import type { Estimate } from './estimates.types';

/** Invoice creation takes precedence over the source estimate's client response. */
export function getEstimateDisplayStatus(estimate: Pick<Estimate, 'issuedInvoiceId' | 'clientState'>) {
  return estimate.issuedInvoiceId ? 'invoiced' : estimate.clientState;
}
