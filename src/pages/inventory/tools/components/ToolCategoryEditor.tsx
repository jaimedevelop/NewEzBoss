import React from 'react';
import GenericCategoryEditor from '../../../../mainComponents/hierarchy/GenericCategoryEditor';
import { getToolHierarchyServices } from '../../../../services/inventory/tools';

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
      services={getToolHierarchyServices()}
      isOpen={isOpen}
      onClose={onClose}
      onCategoryUpdated={onCategoryUpdated}
    />
  );
};

export default ToolCategoryEditor;