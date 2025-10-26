import React from 'react';
import GenericCategoryEditor from '../../../..//mainComponents/hierarchy/GenericCategoryEditor';
import {
  getLaborSections,
  addLaborSection,
  getLaborCategories,
  addLaborCategory
} from '../../../../services/inventory/labor';

interface LaborCategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryUpdated: () => void;
}

const LaborCategoryEditor: React.FC<LaborCategoryEditorProps> = ({
  isOpen,
  onClose,
  onCategoryUpdated
}) => {
  return (
    <GenericCategoryEditor
      moduleName="Labor"
      moduleColor="purple"
      levels={['trade', 'section', 'category']}
      services={{
        getSections: getLaborSections,
        addSection: addLaborSection,
        getCategories: getLaborCategories,
        addCategory: addLaborCategory
      }}
      isOpen={isOpen}
      onClose={onClose}
      onCategoryUpdated={onCategoryUpdated}
    />
  );
};

export default LaborCategoryEditor;