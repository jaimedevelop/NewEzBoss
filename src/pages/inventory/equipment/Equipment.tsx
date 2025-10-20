// src/pages/inventory/equipment/Equipment.tsx
import React, { useState, useMemo, useCallback } from 'react';
import EquipmentHeader from './components/EquipmentHeader';
import EquipmentSearchFilter from './components/EquipmentSearchFilter';
import EquipmentTable from './components/EquipmentTable';
import EquipmentModal from './components/equipmentModal/EquipmentModal';
import { 
  deleteEquipmentItem, 
  type EquipmentItem
} from '../../../services/inventory/equipment';

const Equipment: React.FC = () => {
  // State managed by EquipmentSearchFilter callbacks
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);
  
  // Filter states
  const [filterState, setFilterState] = useState({
    searchTerm: '',
    tradeFilter: '',
    sectionFilter: '',
    categoryFilter: '',
    subcategoryFilter: '',
    equipmentTypeFilter: '',
    statusFilter: '',
    rentalStoreFilter: '',
    sortBy: 'name'
  });
  
  // Add a refresh trigger state
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  // Memoize callbacks to prevent infinite loops
  const handleEquipmentChange = useCallback((filteredEquipment: EquipmentItem[]) => {
    setEquipment(filteredEquipment);
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

  const handleAddEquipment = () => {
    setSelectedEquipment(null);
    setModalMode('create');
    setModalTitle(undefined);
    setIsModalOpen(true);
  };

  const handleEditEquipment = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setModalMode('edit');
    setModalTitle(undefined);
    setIsModalOpen(true);
  };

  const handleViewEquipment = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setModalMode('view');
    setModalTitle(undefined);
    setIsModalOpen(true);
  };

  const handleDuplicateEquipment = (item: EquipmentItem) => {
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

    // Create a copy of the equipment with modified name and no ID
    const duplicatedEquipment: EquipmentItem = {
      ...item,
      id: undefined,
      name: getUniqueName(item.name),
      // Keep all other fields the same
      description: item.description,
      notes: item.notes,
      equipmentType: item.equipmentType,
      tradeId: item.tradeId,
      tradeName: item.tradeName,
      sectionId: item.sectionId,
      sectionName: item.sectionName,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      subcategoryId: item.subcategoryId,
      subcategoryName: item.subcategoryName,
      status: item.status,
      rentalStoreName: item.rentalStoreName,
      rentalStoreLocation: item.rentalStoreLocation,
      dueDate: item.dueDate,
      dailyRate: item.dailyRate,
      weeklyRate: item.weeklyRate,
      monthlyRate: item.monthlyRate,
      pickupDeliveryPrice: item.pickupDeliveryPrice,
      minimumCustomerCharge: item.minimumCustomerCharge,
      isPaidOff: item.isPaidOff,
      loanAmount: item.loanAmount,
      monthlyPayment: item.monthlyPayment,
      loanStartDate: item.loanStartDate,
      loanPayoffDate: item.loanPayoffDate,
      remainingBalance: item.remainingBalance,
      imageUrl: item.imageUrl
    };

    setSelectedEquipment(duplicatedEquipment);
    setModalMode('create');
    setModalTitle('Duplicate Equipment');
    setIsModalOpen(true);
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this equipment? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteEquipmentItem(equipmentId);
      
      if (result.success) {
        // Remove from local state immediately for better UX
        setEquipment(prev => prev.filter(e => e.id !== equipmentId));
        // Trigger data refresh
        setDataRefreshTrigger(prev => prev + 1);
      } else {
        alert(result.error || 'Failed to delete equipment. Please try again.');
      }
    } catch (error: any) {
      console.error('Error deleting equipment:', error);
      alert(error?.message || 'An unexpected error occurred while deleting the equipment.');
    }
  };

  const handleModalSave = () => {
    setIsModalOpen(false);
    setSelectedEquipment(null);
    setModalTitle(undefined);
    // Trigger data refresh
    setDataRefreshTrigger(prev => prev + 1);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEquipment(null);
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
        <EquipmentHeader onAddEquipment={handleAddEquipment} />
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Equipment</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
      <EquipmentHeader onAddEquipment={handleAddEquipment} />

      {/* Search and Filter */}
      <EquipmentSearchFilter
        filterState={filterState}
        onFilterChange={handleFilterChange}
        dataRefreshTrigger={dataRefreshTrigger}
        onEquipmentChange={handleEquipmentChange}
        onLoadingChange={handleLoadingChange}
        onErrorChange={handleErrorChange}
        pageSize={100}
      />

      {/* Equipment Table */}
      <EquipmentTable
        equipment={equipment}
        onEditEquipment={handleEditEquipment}
        onDeleteEquipment={handleDeleteEquipment}
        onViewEquipment={handleViewEquipment}
        onDuplicateEquipment={handleDuplicateEquipment}
        loading={loading}
      />

      {/* Equipment Modal */}
      <EquipmentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        equipment={selectedEquipment}
        mode={modalMode}
        title={modalTitle}
      />
    </div>
  );
};

export default Equipment;