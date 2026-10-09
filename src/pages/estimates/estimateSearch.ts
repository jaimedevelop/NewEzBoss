import type { EstimateWithId } from '../../services/estimates/estimates.types';

export const ESTIMATE_SEARCH_HINT = 'Search by customer name, estimate or invoice number, P.O. number, phone, email, billing/service address, or line-item name/description.';

const address = (parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' ');

export function matchesEstimateSearch(estimate: EstimateWithId, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  const client = estimate.clientSnapshot;
  const phones = [estimate.customerPhone, client?.phoneMobile, client?.phoneOther];
  const values = [
    estimate.customerName, estimate.estimateNumber, estimate.invoiceNumber,
    estimate.poNumber, estimate.customerEmail, ...phones,
    address([estimate.serviceAddress, estimate.serviceAddress2, estimate.serviceCity, estimate.serviceState, estimate.serviceZipCode]),
    address([client?.billingAddress, client?.billingAddress2, client?.billingCity, client?.billingState, client?.billingZipCode]),
  ];
  if (values.some(value => value?.toLowerCase().includes(term))) return true;

  const lineItemText = estimate.lineItemSearchText ??
    estimate.lineItems?.flatMap(item => [item.name ?? '', item.description]);
  if (lineItemText?.some(value => value.toLowerCase().includes(term))) return true;

  // Normalize phone-only queries without turning address or P.O. text into phone matches.
  const digits = term.replace(/\D/g, '');
  return digits.length > 0 && /^[\d\s()+.\-]+$/.test(term) &&
    phones.some(phone => phone?.replace(/\D/g, '').includes(digits));
}
