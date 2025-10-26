import React from 'react';
import GenericCategoryEditor from '../../../../mainComponents/hierarchy/GenericCategoryEditor';
import {
  getEquipmentSections,
  addEquipmentSection,
  getEquipmentCategories,
  addEquipmentCategory,
  getEquipmentSubcategories,
  addEquipmentSubcategory
} from '../../../../services/inventory/equipment';

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
      services={{
        getSections: getEquipmentSections,
        addSection: addEquipmentSection,
        getCategories: getEquipmentCategories,
        addCategory: addEquipmentCategory,
        getSubcategories: getEquipmentSubcategories,
        addSubcategory: addEquipmentSubcategory
      }}
      isOpen={isOpen}
      onClose={onClose}
      onCategoryUpdated={onCategoryUpdated}
    />
  );
};

export default EquipmentCategoryEditor;