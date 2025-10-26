import React from 'react';
import GenericCategoryEditor from '../../../../mainComponents/hierarchy/GenericCategoryEditor';
import {
  getToolSections,
  addToolSection,
  getToolCategories,
  addToolCategory,
  getToolSubcategories,
  addToolSubcategory
} from '../../../../services/inventory/tools';

interface ToolCategoryEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryUpdated: () => void;
}

const ToolCategoryEditor: React.FC<ToolCategoryEditorProps> = ({
  isOpen,
  onClose,
  onCategoryUpdated
}) => {
  return (
    <GenericCategoryEditor
      moduleName="Tools"
      moduleColor="blue"
      levels={['trade', 'section', 'category', 'subcategory']}
      services={{
        getSections: getToolSections,
        addSection: addToolSection,
        getCategories: getToolCategories,
        addCategory: addToolCategory,
        getSubcategories: getToolSubcategories,
        addSubcategory: addToolSubcategory
      }}
      isOpen={isOpen}
      onClose={onClose}
      onCategoryUpdated={onCategoryUpdated}
    />
  );
};

export default ToolCategoryEditor;