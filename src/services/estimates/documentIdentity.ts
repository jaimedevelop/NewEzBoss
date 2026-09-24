import type { Estimate } from './estimates.types';

export function getDocumentIdentity(estimate: Pick<Estimate, 'estimateNumber' | 'invoiceNumber' | 'estimateState'>) {
  if (estimate.estimateState === 'change-order') {
    return { title: 'CHANGE ORDER', primaryNumber: estimate.estimateNumber || 'Draft', exportFilename: `Change-Order-${estimate.estimateNumber || 'download'}.pdf` };
  }
  if (estimate.estimateState === 'invoice') {
    const number = estimate.invoiceNumber || 'Number pending';
    return { title: 'INVOICE', primaryNumber: number, exportFilename: `Invoice-${estimate.invoiceNumber || 'download'}.pdf` };
  }
  return { title: 'ESTIMATE', primaryNumber: estimate.estimateNumber || 'Draft', exportFilename: `Estimate-${estimate.estimateNumber || 'download'}.pdf` };
}
