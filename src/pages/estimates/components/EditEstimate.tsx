import React from 'react';
import { EstimateForm } from './EstimateForm';

interface EditEstimateProps {
  estimateId: string;
  onSave: () => void;
  onCancel: () => void;
}

export const EditEstimate: React.FC<EditEstimateProps> = ({
  estimateId,
  onSave,
  onCancel
}) => {
  return (
    <EstimateForm
      mode="edit"
      estimateId={estimateId}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};