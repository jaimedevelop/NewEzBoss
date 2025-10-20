// src/pages/inventory/tools/components/toolModal/ToolModal.tsx
import React, { useMemo } from 'react';
import { X, Wrench, DollarSign, Image } from 'lucide-react';
import { LoadingButton } from '../../../../../mainComponents/ui/LoadingButton';
import { ToolCreationProvider, useToolCreation } from '../../../../../contexts/ToolCreationContext';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import GeneralTab from './GeneralTab';
import PriceTab from './PriceTab';
import ImageTab from './ImageTab';
import { createToolItem, updateToolItem, type ToolItem } from '../../../../../services/inventory/tools';

interface ToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  tool?: ToolItem | null;
  title?: string;
  mode?: 'create' | 'edit' | 'view';
}

// Tab component with error indicators
function TabButton({ 
  id, 
  label, 
  icon: Icon,
  isActive, 
  onClick, 
  hasError,
  disabled 
}: { 
  id: string; 
  label: string; 
  icon: React.ComponentType<any>;
  isActive: boolean; 
  onClick: () => void;
  hasError?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
        isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-default' : ''}`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {hasError && !disabled && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      )}
    </button>
  );
}

// Modal content component (needs to be inside the provider)
function ToolModalContent({ 
  onClose, 
  onSave, 
  tool, 
  title,
  mode = 'create'
}: { 
  onClose: () => void; 
  onSave: () => void; 
  tool?: ToolItem | null;
  title?: string;
  mode?: 'create' | 'edit' | 'view';
}) {
  const { currentUser } = useAuthContext();
  const { 
    state, 
    setActiveTab, 
    validateForm, 
    setSubmitting, 
    resetForm
  } = useToolCreation();
  
  const { formData, activeTab, isSubmitting, isDirty } = state;
  const isViewMode = mode === 'view';

  // Determine the modal title based on mode
  const modalTitle = title || (
    mode === 'view' ? 'View Tool' : 
    mode === 'edit' ? 'Edit Tool' : 
    'Add New Tool'
  );

  // Check for errors in each tab (only in non-view mode)
  const getTabErrors = (tabName: string) => {
    if (isViewMode) return false;
    
    const tabFieldMap: Record<string, string[]> = {
      general: ['name', 'tradeId', 'status', 'purchaseDate', 'warrantyExpiration', 'description', 'notes'],
      price: ['minimumCustomerCharge'],
      image: ['imageUrl']
    };
    
    const fields = tabFieldMap[tabName] || [];
    return fields.some(field => formData.errors[field]);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isViewMode) return;
    
    if (!validateForm()) {
      const tabsWithErrors = ['general', 'price', 'image'].find(tab => getTabErrors(tab));
      if (tabsWithErrors) {
        setActiveTab(tabsWithErrors as any);
      }
      return;
    }

    setSubmitting(true);
    
    try {
      // Prepare tool data for database
      const toolForDatabase: Omit<ToolItem, 'id' | 'createdAt' | 'updatedAt'> = {
        name: formData.name,
        brand: formData.brand,
        description: formData.description,
        notes: formData.notes,
        tradeId: formData.tradeId,
        tradeName: formData.tradeName,
        sectionId: formData.sectionId,
        sectionName: formData.sectionName,
        categoryId: formData.categoryId,
        categoryName: formData.categoryName,
        subcategoryId: formData.subcategoryId,
        subcategoryName: formData.subcategoryName,
        status: formData.status as 'available' | 'in-use' | 'maintenance',
        location: formData.location,
        purchaseDate: formData.purchaseDate,
        warrantyExpiration: formData.warrantyExpiration,
        minimumCustomerCharge: formData.minimumCustomerCharge,
        imageUrl: formData.imageUrl
      };

      let result;
      if (mode === 'edit' && tool?.id) {
        result = await updateToolItem(tool.id, toolForDatabase);
      } else {
        result = await createToolItem(toolForDatabase, currentUser!.uid);
      }

      if (result.success) {
        onSave();
        resetForm();
        onClose();
      } else {
        throw new Error(result.error || 'Failed to save tool');
      }
    } catch (error) {
      console.error('Error submitting tool:', error);
      alert(`Error saving tool: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isViewMode) {
      resetForm();
      onClose();
      return;
    }
    
    if (isDirty) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }
    resetForm();
    onClose();
  };

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Wrench },
    { id: 'price' as const, label: 'Price', icon: DollarSign },
    { id: 'image' as const, label: 'Image', icon: Image }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab disabled={isViewMode} />;
      case 'price':
        return <PriceTab disabled={isViewMode} />;
      case 'image':
        return <ImageTab disabled={isViewMode} />;
      default:
        return <GeneralTab disabled={isViewMode} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => (
              <TabButton
                key={tab.id}
                id={tab.id}
                label={tab.label}
                icon={tab.icon}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                hasError={getTabErrors(tab.id)}
                disabled={false}
              />
            ))}
          </nav>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 min-h-[300px]">
              {renderTabContent()}
            </div>
          </div>

          {/* Footer */}
          {!isViewMode && (
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <LoadingButton
                type="submit"
                loading={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {mode === 'edit' ? 'Update Tool' : 'Create Tool'}
              </LoadingButton>
            </div>
          )}
          
          {/* View mode footer */}
          {isViewMode && (
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// Main component with provider wrapper
const ToolModal: React.FC<ToolModalProps> = ({ isOpen, onClose, onSave, tool, title, mode = 'create' }) => {
  if (!isOpen) return null;

  // Prepare initial tool data
  const initialToolData = useMemo(() => {
    if (tool) {
      return {
        id: tool.id,
        name: tool.name || '',
        brand: tool.brand || '',
        description: tool.description || '',
        notes: tool.notes || '',
        tradeId: tool.tradeId || '',
        tradeName: tool.tradeName || '',
        sectionId: tool.sectionId || '',
        sectionName: tool.sectionName || '',
        categoryId: tool.categoryId || '',
        categoryName: tool.categoryName || '',
        subcategoryId: tool.subcategoryId || '',
        subcategoryName: tool.subcategoryName || '',
        status: tool.status || '',
        location: tool.location || '',
        purchaseDate: tool.purchaseDate || new Date().toISOString().split('T')[0],
        warrantyExpiration: tool.warrantyExpiration || '',
        minimumCustomerCharge: tool.minimumCustomerCharge || 0,
        imageUrl: tool.imageUrl || ''
      };
    }
    return undefined;
  }, [tool]);

  return (
    <ToolCreationProvider initialTool={initialToolData}>
      <ToolModalContent 
        onClose={onClose}
        onSave={onSave}
        tool={tool}
        title={title}
        mode={mode}
      />
    </ToolCreationProvider>
  );
};

export default ToolModal;