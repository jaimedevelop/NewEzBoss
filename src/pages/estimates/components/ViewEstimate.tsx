import React from 'react';
import { EstimateForm } from './EstimateForm';

interface ViewEstimateProps {
  estimateId: string;
  onClose: () => void;
  onConvertToInvoice?: (estimateData: any) => void;
  onDownloadPDF?: (estimateData: any) => void;
}

export const ViewEstimate: React.FC<ViewEstimateProps> = ({
  estimateId,
  onClose,
  onConvertToInvoice,
  onDownloadPDF
}) => {
  return (
    <EstimateForm
      mode="view"
      estimateId={estimateId}
      onCancel={onClose}
      onConvertToInvoice={onConvertToInvoice}
      onDownloadPDF={onDownloadPDF}
    />
  );
};