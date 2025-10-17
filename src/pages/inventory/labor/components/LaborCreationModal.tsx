// src/pages/labor/components/LaborCreationModal.tsx
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Clock, ListChecks, Info } from 'lucide-react';
import { LaborCreationProvider, useLaborCreation } from '../../../../contexts/LaborCreationContext';
import { createLaborItem, updateLaborItem, LaborItem } from '../../../../services/inventory/labor';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { Alert } from '../../../../mainComponents/ui/Alert';
import GeneralTab from './laborModal/GeneralTab';
import FlatRateTab from './laborModal/FlatRateTab';
import HourlyRateTab from './laborModal/HourlyRateTab';
import TaskTab from './laborModal/TaskTab';

interface LaborCreationModalProps {
  item: LaborItem | null;
  viewOnly?: boolean;
  onClose: () => void;
  onSave: (savedItem: LaborItem) => void;
}

type TabType = 'general' | 'flat-rate' | 'hourly' | 'tasks';

const LaborCreationModalContent: React.FC<LaborCreationModalProps> = ({ item, viewOnly = false, onClose, onSave }) => {
  const { currentUser } = useAuthContext();
  const { state, resetForm, setFormData } = useLaborCreation();
  const { formData } = state;

  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Populate form if editing
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        tradeId: item.tradeId || '',        
        tradeName: item.tradeName || '',       
        sectionId: item.sectionId || '',       
        sectionName: item.sectionName || '',   
        categoryId: item.categoryId || '',     
        categoryName: item.categoryName || '',
        estimatedHours: item.estimatedHours?.toString() || '',
        flatRates: item.flatRates?.map(fr => ({
          id: fr.id,
          name: fr.name,
          rate: fr.rate.toString()
        })) || [],
        hourlyRates: item.hourlyRates?.map(hr => ({
          id: hr.id,
          name: hr.name,
          skillLevel: hr.skillLevel,
          hourlyRate: hr.hourlyRate.toString()
        })) || [],
        tasks: item.tasks?.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description
        })) || [],
        isActive: item.isActive ?? true
      });
    } else {
      resetForm();
    }
  }, [item]);

  const tabs = [
    { id: 'general', label: 'General', icon: Info, color: 'purple' },
    { id: 'flat-rate', label: 'Flat Rate', icon: DollarSign, color: 'blue' },
    { id: 'hourly', label: 'Hourly Rate', icon: Clock, color: 'green' },
    { id: 'tasks', label: 'Tasks', icon: ListChecks, color: 'orange' },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.tradeId.trim()) {
      newErrors.tradeId = 'Trade is required';
    }

    if (!formData.sectionId.trim()) {
      newErrors.sectionId = 'Section is required';
    }

    if (!formData.categoryId.trim()) {
      newErrors.categoryId = 'Category is required';
    }

    setValidationErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validate()) {
      setActiveTab('general'); // Switch to general tab to show errors
      return;
    }

    if (!currentUser?.uid) {
      setError('You must be logged in to save labor items');
      return;
    }

    setIsSaving(true);

    try {
      // Prepare the labor data
      const laborData: Partial<LaborItem> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        tradeId: formData.tradeId.trim(),           
        tradeName: formData.tradeName.trim(),       
        sectionId: formData.sectionId.trim(),       
        sectionName: formData.sectionName.trim(),   
        categoryId: formData.categoryId.trim(),     
        categoryName: formData.categoryName.trim(), 
        isActive: formData.isActive,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        flatRates: formData.flatRates
          .filter(fr => fr.name && fr.rate)
          .map(fr => ({
            id: fr.id,
            name: fr.name,
            rate: parseFloat(fr.rate)
          })),
        hourlyRates: formData.hourlyRates
          .filter(hr => hr.name && hr.hourlyRate)
          .map(hr => ({
            id: hr.id,
            name: hr.name,
            skillLevel: hr.skillLevel,
            hourlyRate: parseFloat(hr.hourlyRate)
          })),
        tasks: formData.tasks
          .filter(t => t.name)
          .map(t => ({
            id: t.id,
            name: t.name,
            description: t.description
          }))
      };

      let result;
      if (item?.id) {
        // Update existing
        result = await updateLaborItem(item.id, laborData);
      } else {
        // Create new
        result = await createLaborItem(laborData, currentUser.uid);
      }

      if (result.success) {
        const savedItem: LaborItem = {
          ...laborData,
          id: item?.id || result.data,
          userId: currentUser.uid
        } as LaborItem;
        
        onSave(savedItem);
        resetForm();
        onClose();
      } else {
        setError(result.error || 'Failed to save labor item');
      }
    } catch (err) {
      console.error('Error saving labor item:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTabContent = () => {
    const disabled = viewOnly || isSaving;
    
    switch (activeTab) {
      case 'general':
        return <GeneralTab disabled={disabled} />;
      case 'flat-rate':
        return <FlatRateTab disabled={disabled} />;
      case 'hourly':
        return <HourlyRateTab disabled={disabled} />;
      case 'tasks':
        return <TaskTab disabled={disabled} />;
      default:
        return null;
    }
  };

  // Determine modal title
  const getModalTitle = () => {
    if (viewOnly) return 'View Labor Item';
    if (item?.id) return 'Edit Labor Item';
    return 'Add Labor Item';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {getModalTitle()}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSaving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4">
            <Alert variant="error" onClose={() => setError('')}>
              {error}
            </Alert>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 sticky top-[73px] bg-white z-10">
          <nav className="flex -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const hasError = activeTab === 'general' && (
              validationErrors.name || 
              validationErrors.tradeId || 
              validationErrors.sectionId || 
              validationErrors.categoryId
            );
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  disabled={isSaving}
                  className={`flex-1 flex items-center justify-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? `border-${tab.color}-500 text-${tab.color}-600`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.id === 'general' && hasError && (
                    <span className="ml-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Tab Content */}
          <div className="mb-6">
            {renderTabContent()}
          </div>

          {/* Validation Errors from General Tab */}
          {!viewOnly && activeTab !== 'general' && Object.keys(validationErrors).length > 0 && (
            <div className="mb-6">
              <Alert variant="warning">
                Please fix errors in the General tab before saving
              </Alert>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {viewOnly ? 'Close' : 'Cancel'}
            </button>
            {!viewOnly && (
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>{item?.id ? 'Update Labor Item' : 'Create Labor Item'}</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

// Wrapper with Provider
export const LaborCreationModal: React.FC<LaborCreationModalProps> = (props) => {
  return (
    <LaborCreationProvider>
      <LaborCreationModalContent {...props} />
    </LaborCreationProvider>
  );
};

export default LaborCreationModal;