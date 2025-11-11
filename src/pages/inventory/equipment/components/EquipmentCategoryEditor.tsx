import React from 'react';
import GenericCategoryEditor from '../../../../mainComponents/hierarchy/GenericCategoryEditor';
import { getEquipmentHierarchyServices } from '../../../../services/inventory/equipment';

interface EquipmentCategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryUpdated: () => void;
}

const EquipmentCategoryEditor: React.FC<EquipmentCategoryEditorProps> = ({
  isOpen,
  onClose,
  onCategoryUpdated
}) => {
  return (
    <GenericCategoryEditor
      moduleName="Equipment"
      moduleColor="green"
      levels={['trade', 'section', 'category', 'subcategory']}
      services={getEquipmentHierarchyServices()}
      isOpen={isOpen}
      onClose={onClose}
      onCategoryUpdated={onCategoryUpdated}
    />
  );
};

export default EquipmentCategoryEditor;