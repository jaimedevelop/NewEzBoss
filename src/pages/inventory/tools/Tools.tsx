// src/pages/inventory/tools/Tools.tsx
import React, { useState, useMemo, useCallback } from 'react';
import ToolsHeader from './components/ToolsHeader';
import ToolsSearchFilter from './components/ToolSearchFilter';
import ToolTable from './components/ToolsTable';
import ToolModal from './components/toolModal/ToolModal';
import { 
  deleteToolItem, 
  type ToolItem
} from '../../../services/inventory/tools';

const Tools: React.FC = () => {
  // State managed by ToolsSearchFilter callbacks
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  
  // Filter states
  const [filterState, setFilterState] = useState({
    searchTerm: '',
    tradeFilter: '',
    sectionFilter: '',
    categoryFilter: '',
    subcategoryFilter: '',
    statusFilter: '',
    sortBy: 'name'
  });
  
  // Add a refresh trigger state
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  // Memoize callbacks to prevent infinite loops
  const handleToolsChange = useCallback((filteredTools: ToolItem[]) => {
    setTools(filteredTools);
  }, []);

  const handleLoadingChange = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const handleErrorChange = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilterState: typeof filterState) => {
    setFilterState(newFilterState);
  }, []);

  const handleAddTool = () => {
    setSelectedTool(null);
    setModalMode('create');
    setModalTitle(undefined);
    setIsModalOpen(true);
  };

  const handleEditTool = (tool: ToolItem) => {
    setSelectedTool(tool);
    setModalMode('edit');
    setModalTitle(undefined);
    setIsModalOpen(true);
  };

  const handleViewTool = (tool: ToolItem) => {
    setSelectedTool(tool);
    setModalMode('view');
    setModalTitle(undefined);
    setIsModalOpen(true);
  };

  const handleDuplicateTool = (tool: ToolItem) => {
    // Generate a unique name for the duplicate
    const getUniqueName = (baseName: string) => {
      const match = baseName.match(/^(.*?)\s*\((\d+)\)$/);
      if (match) {
        const base = match[1];
        const num = parseInt(match[2]) + 1;
        return `${base} (${num})`;
      } else {
        return `${baseName} (1)`;
      }
    };

    // Create a copy of the tool with modified name, reset purchase date, and no ID
    const duplicatedTool: ToolItem = {
      ...tool,
      id: undefined,
      name: getUniqueName(tool.name),
      purchaseDate: new Date().toISOString().split('T')[0], // Reset to today
      // Keep all other fields the same
      brand: tool.brand,
      tradeId: tool.tradeId,
      tradeName: tool.tradeName,
      sectionId: tool.sectionId,
      sectionName: tool.sectionName,
      categoryId: tool.categoryId,
      categoryName: tool.categoryName,
      subcategoryId: tool.subcategoryId,
      subcategoryName: tool.subcategoryName,
      description: tool.description,
      notes: tool.notes,
      status: tool.status,
      location: tool.location,
      warrantyExpiration: tool.warrantyExpiration,
      minimumCustomerCharge: tool.minimumCustomerCharge,
      imageUrl: tool.imageUrl
    };

    setSelectedTool(duplicatedTool);
    setModalMode('create');
    setModalTitle('Duplicate Tool');
    setIsModalOpen(true);
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!window.confirm('Are you sure you want to delete this tool? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteToolItem(toolId);
      
      if (result.success) {
        // Remove from local state immediately for better UX
        setTools(prev => prev.filter(t => t.id !== toolId));
        // Trigger data refresh
        setDataRefreshTrigger(prev => prev + 1);
      } else {
        alert(result.error || 'Failed to delete tool. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting tool:', error);
      alert(error?.message || 'An unexpected error occurred while deleting the tool.');
    }
  };

  const handleModalSave = () => {
    setIsModalOpen(false);
    setSelectedTool(null);
    setModalTitle(undefined);
    // Trigger data refresh
    setDataRefreshTrigger(prev => prev + 1);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTool(null);
    setModalTitle(undefined);
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    setDataRefreshTrigger(prev => prev + 1);
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="space-y-8">
        <ToolsHeader onAddTool={handleAddTool} />
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Tools</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <ToolsHeader onAddTool={handleAddTool} />

      {/* Search and Filter */}
      <ToolsSearchFilter
        filterState={filterState}
        onFilterChange={handleFilterChange}
        dataRefreshTrigger={dataRefreshTrigger}
        onToolsChange={handleToolsChange}
        onLoadingChange={handleLoadingChange}
        onErrorChange={handleErrorChange}
        pageSize={100}
      />

      {/* Tools Table */}
      <ToolTable
        tools={tools}
        onEditTool={handleEditTool}
        onDeleteTool={handleDeleteTool}
        onViewTool={handleViewTool}
        onDuplicateTool={handleDuplicateTool}
        loading={loading}
      />

      {/* Tool Modal */}
      <ToolModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        tool={selectedTool}
        mode={modalMode}
        title={modalTitle}
      />
    </div>
  );
};

export default Tools;