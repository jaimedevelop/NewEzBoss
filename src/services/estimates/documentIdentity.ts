import type { Estimate } from './estimates.types';

export function getDocumentPdfVersion(
  document: Pick<Estimate, 'estimateState' | 'currentRevision'>,
  currentUrl: string,
) {
  const revision = document.currentRevision ?? 0;
  const isEstimate = document.estimateState !== 'invoice' && document.estimateState !== 'change-order';
  if (isEstimate && revision < 2) return undefined;
  return { revision, currentUrl };
}

export function getDocumentIdentity(estimate: Pick<Estimate, 'estimateNumber' | 'invoiceNumber' | 'estimateState'>) {
  if (estimate.estimateState === 'change-order') {
    return { title: 'CHANGE ORDER', primaryNumber: estimate.estimateNumber || 'Draft', exportFilename: `Change-Order-${estimate.estimateNumber || 'download'}.pdf` };
  }
  if (estimate.estimateState === 'invoice') {
    const number = estimate.invoiceNumber || 'Number pending';
    return { title: 'INVOICE', primaryNumber: number, exportFilename: `INV-${(estimate.invoiceNumber || 'download').replace(/^INV-/i, '')}.pdf` };
  }
  return { title: 'ESTIMATE', primaryNumber: estimate.estimateNumber || 'Draft', exportFilename: `EST-${(estimate.estimateNumber || 'download').replace(/^EST-/i, '')}.pdf` };
}
