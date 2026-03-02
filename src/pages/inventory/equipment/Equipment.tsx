import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import EquipmentHeader from './components/EquipmentHeader';
import EquipmentSearchFilter from './components/EquipmentSearchFilter';
import EquipmentTable from './components/EquipmentTable';
import EquipmentModal from './components/equipmentModal/EquipmentModal';
import { deleteEquipmentItem } from '../../../services/inventory/equipment/equipment.mutations';
import { type EquipmentItem } from '../../../services/inventory/equipment/equipment.types';
import { useIsMobile } from '../../../mobile/inventory/useIsMobile';
import MobilePageHeader from '../../../mobile/inventory/MobilePageHeader';
import MobileSearchBar from '../../../mobile/inventory/MobileSearchBar';
import MobileFilterSheet from '../../../mobile/inventory/MobileFilterSheet';
import MobileCardList from '../../../mobile/inventory/MobileCardList';
import MobileItemCard, { type CardField, type CardBadge } from '../../../mobile/inventory/MobileItemCard';

const matchesAllWords = (item: EquipmentItem, term: string): boolean => {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [
    item.name, item.description,
    item.tradeName ?? item.trade,
    item.sectionName ?? item.section,
    item.categoryName ?? item.category,
    item.subcategoryName ?? item.subcategory,
    item.brand
  ]
    .map(v => v ?? '')
    .join(' ')
    .toLowerCase();
  return words.every(word => haystack.includes(word));
};

const Equipment: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);

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

  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [mobileSearchTerm, setMobileSearchTerm] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const handleEquipmentChange = useCallback((e: EquipmentItem[]) => setEquipment(e), []);
  const handleLoadingChange = useCallback((v: boolean) => setLoading(v), []);
  const handleErrorChange = useCallback((v: string | null) => setError(v), []);
  const handleFilterChange = useCallback((s: typeof filterState) => setFilterState(s), []);
  const handleCategoryUpdate = () => setReloadTrigger(prev => prev + 1);

  const handleAddEquipment = () => { setSelectedEquipment(null); setModalMode('create'); setModalTitle(undefined); setIsModalOpen(true); };
  const handleEditEquipment = (item: EquipmentItem) => { setSelectedEquipment(item); setModalMode('edit'); setModalTitle(undefined); setIsModalOpen(true); };
  const handleViewEquipment = (item: EquipmentItem) => { setSelectedEquipment(item); setModalMode('view'); setModalTitle(undefined); setIsModalOpen(true); };

  const handleDuplicateEquipment = (item: EquipmentItem) => {
    const getUniqueName = (name: string) => {
      const match = name.match(/^(.*?)\s*\((\d+)\)$/);
      return match ? `${match[1]} (${parseInt(match[2]) + 1})` : `${name} (1)`;
    };
    setSelectedEquipment({ ...item, id: undefined, name: getUniqueName(item.name) });
    setModalMode('create');
    setModalTitle('Duplicate Equipment');
    setIsModalOpen(true);
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this equipment? This action cannot be undone.')) return;
    try {
      const result = await deleteEquipmentItem(equipmentId);
      if (result.success) {
        setEquipment(prev => prev.filter(e => e.id !== equipmentId));
        setDataRefreshTrigger(prev => prev + 1);
      } else {
        alert(result.error || 'Failed to delete equipment.');
      }
    } catch (err: any) {
      alert(err?.message || 'An unexpected error occurred.');
    }
  };

  const handleModalSave = () => { setIsModalOpen(false); setSelectedEquipment(null); setModalTitle(undefined); setDataRefreshTrigger(prev => prev + 1); };
  const handleModalClose = () => { setIsModalOpen(false); setSelectedEquipment(null); setModalTitle(undefined); };
  const handleRetry = () => { setError(null); setLoading(true); setDataRefreshTrigger(prev => prev + 1); };

  const activeFilterCount = useMemo(() => [
    filterState.tradeFilter, filterState.sectionFilter, filterState.categoryFilter,
    filterState.subcategoryFilter, filterState.equipmentTypeFilter, filterState.statusFilter, filterState.rentalStoreFilter
  ].filter(Boolean).length, [filterState]);

  const getStatusBadge = (item: EquipmentItem): CardBadge => {
    const s = (item.status || '').toLowerCase();
    if (s === 'available') return { label: 'Available', color: 'green' };
    if (s === 'in use') return { label: 'In Use', color: 'orange' };
    if (s === 'maintenance') return { label: 'Maintenance', color: 'yellow' };
    return { label: item.status || 'Unknown', color: 'gray' };
  };

  const getCardFields = (item: EquipmentItem): CardField[] => [
    { label: 'Trade', value: item.trade || '—' },
    { label: 'Category', value: item.category || '—' },
    { label: 'Daily Rate', value: item.dailyRate ? `$${item.dailyRate.toFixed(2)}` : '—', valueColor: 'orange' },
    { label: 'Location', value: item.location || '—' }
  ];

  const mobileEquipment = useMemo(() => {
    if (!mobileSearchTerm) return equipment;
    return equipment.filter(e => matchesAllWords(e, mobileSearchTerm));
  }, [equipment, mobileSearchTerm]);

  // ── Mobile layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobilePageHeader
          title="Equipment"
          itemCount={mobileEquipment.length}
          onAdd={handleAddEquipment}
          onBack={() => navigate('/inventory')}
        />

        <MobileSearchBar
          value={mobileSearchTerm}
          onChange={setMobileSearchTerm}
          onOpenFilters={() => setIsFilterSheetOpen(true)}
          activeFilterCount={activeFilterCount}
          placeholder="Search equipment..."
        />

        <MobileCardList
          loading={loading}
          error={error}
          isEmpty={!loading && mobileEquipment.length === 0}
          emptyMessage="No equipment found"
          emptySubMessage="Try adjusting your filters or add equipment."
          onRetry={handleRetry}
        >
          {mobileEquipment.map(item => (
            <MobileItemCard
              key={item.id}
              id={item.id!}
              title={item.name}
              subtitle={item.description}
              imageUrl={item.imageUrl}
              badge={getStatusBadge(item)}
              fields={getCardFields(item)}
              onView={id => navigate(`/equipment/${id}/detail`)}
            />
          ))}
        </MobileCardList>

        <MobileFilterSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          onClear={() => handleFilterChange({ searchTerm: '', tradeFilter: '', sectionFilter: '', categoryFilter: '', subcategoryFilter: '', equipmentTypeFilter: '', statusFilter: '', rentalStoreFilter: '', sortBy: 'name' })}
          activeFilterCount={activeFilterCount}
        >
          <div className="sr-only">
            <EquipmentSearchFilter
              filterState={filterState}
              onFilterChange={handleFilterChange}
              dataRefreshTrigger={dataRefreshTrigger + reloadTrigger}
              onEquipmentChange={handleEquipmentChange}
              onLoadingChange={handleLoadingChange}
              onErrorChange={handleErrorChange}
              onCategoryUpdated={handleCategoryUpdate}
            />
          </div>
          <p className="text-sm text-gray-500 text-center py-4">
            Advanced filters coming soon. Use search to narrow results.
          </p>
        </MobileFilterSheet>

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
  }

  // ── Desktop layout (unchanged) ─────────────────────────────────
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
          <button onClick={handleRetry} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <EquipmentHeader onAddEquipment={handleAddEquipment} />
      <EquipmentSearchFilter
        filterState={filterState}
        onFilterChange={handleFilterChange}
        dataRefreshTrigger={dataRefreshTrigger + reloadTrigger}
        onEquipmentChange={handleEquipmentChange}
        onLoadingChange={handleLoadingChange}
        onErrorChange={handleErrorChange}
        onCategoryUpdated={handleCategoryUpdate}
      />
      <EquipmentTable
        equipment={equipment}
        onEditEquipment={handleEditEquipment}
        onDeleteEquipment={handleDeleteEquipment}
        onViewEquipment={handleViewEquipment}
        onDuplicateEquipment={handleDuplicateEquipment}
        loading={loading}
      />
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