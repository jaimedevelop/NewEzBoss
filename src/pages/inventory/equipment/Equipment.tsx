import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus } from 'lucide-react';
import VariableHeader from '../../../mainComponents/ui/VariableHeader';
import EquipmentSearchFilter from './components/EquipmentSearchFilter';
import EquipmentTable from './components/EquipmentTable';
import EquipmentModal from './components/equipmentModal/EquipmentModal';
import { deleteEquipmentItem } from '../../../services/inventory/equipment/equipment.mutations';
import { getEquipmentPage, type EquipmentItem, type EquipmentFilters } from '../../../services/inventory/equipment';
import { useIsMobile } from '../../../mobile/inventory/useIsMobile';
import MobilePageHeader from '../../../mobile/inventory/MobilePageHeader';
import MobileSearchBar from '../../../mobile/inventory/MobileSearchBar';
import MobileFilterSheet from '../../../mobile/inventory/MobileFilterSheet';
import EquipmentMobileFilter from '../../../mobile/inventory/filters/EquipmentMobileFilter';
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
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [mobileSearchTerm, setMobileSearchTerm] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const handleEquipmentChange = useCallback((e: EquipmentItem[]) => setEquipment(e), []);
  const handleLoadingChange = useCallback((v: boolean) => setLoading(v), []);
  const handleErrorChange = useCallback((v: string | null) => setError(v), []);
  const handleFilterChange = useCallback((s: typeof filterState) => {
    setPageCursors([undefined]);
    setNextCursor(null);
    setFilterState(s);
  }, []);
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
        setPageCursors([undefined]);
        setNextCursor(null);
        setDataRefreshTrigger(prev => prev + 1);
      } else {
        alert(result.error || 'Failed to delete equipment.');
      }
    } catch (err: any) {
      alert(err?.message || 'An unexpected error occurred.');
    }
  };

  const handleModalSave = () => { setIsModalOpen(false); setSelectedEquipment(null); setModalTitle(undefined); setPageCursors([undefined]); setNextCursor(null); setDataRefreshTrigger(prev => prev + 1); };
  const handleModalClose = () => { setIsModalOpen(false); setSelectedEquipment(null); setModalTitle(undefined); };
  const handleRetry = () => { setError(null); setLoading(true); setDataRefreshTrigger(prev => prev + 1); };

  const activeFilterCount = useMemo(() => [
    filterState.tradeFilter, filterState.sectionFilter, filterState.categoryFilter,
    filterState.subcategoryFilter, filterState.equipmentTypeFilter, filterState.statusFilter, filterState.rentalStoreFilter
  ].filter(Boolean).length, [filterState]);

  useEffect(() => {
    if (isMobile) return;
    let active = true;
    setLoading(true);
    setError(null);
    const filters: EquipmentFilters = {
      tradeId: filterState.tradeFilter || undefined,
      sectionId: filterState.sectionFilter || undefined,
      categoryId: filterState.categoryFilter || undefined,
      subcategoryId: filterState.subcategoryFilter || undefined,
      equipmentType: (filterState.equipmentTypeFilter as EquipmentFilters['equipmentType']) || undefined,
      status: filterState.statusFilter || undefined,
      rentalStoreId: filterState.rentalStoreFilter || undefined,
      searchTerm: filterState.searchTerm,
      sortBy: filterState.sortBy as EquipmentFilters['sortBy'],
      sortOrder: 'asc',
    };
    getEquipmentPage(filters, pageCursors.at(-1)).then(result => {
      if (!active) return;
      if (result.success && result.data) {
        setEquipment(result.data.items);
        setNextCursor(result.data.nextCursor);
        setTotalCount(result.data.totalCount);
      } else {
        setEquipment([]);
        setError(result.error || 'Failed to load equipment');
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [isMobile, filterState, pageCursors, dataRefreshTrigger]);

  const getStatusBadge = (item: EquipmentItem): CardBadge => {
    const s = (item.status || '').toLowerCase();
    if (s === 'available') return { label: 'Available', color: 'green' };
    if (s === 'in use') return { label: 'In Use', color: 'orange' };
    if (s === 'maintenance') return { label: 'Maintenance', color: 'yellow' };
    return { label: item.status || 'Unknown', color: 'gray' };
  };

  const getCardFields = (item: EquipmentItem): CardField[] => [
    { label: 'Trade', value: item.tradeName || '—' },
    { label: 'Category', value: item.categoryName || '—' },
    { label: 'Daily Rate', value: item.minimumCustomerCharge ? `$${item.minimumCustomerCharge.toFixed(2)}` : '—', valueColor: 'orange' },
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

        {/* Hidden filter — mounted immediately so data loads on page open */}
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

        <MobileFilterSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          onClear={() => handleFilterChange({ searchTerm: '', tradeFilter: '', sectionFilter: '', categoryFilter: '', subcategoryFilter: '', equipmentTypeFilter: '', statusFilter: '', rentalStoreFilter: '', sortBy: 'name' })}
          activeFilterCount={activeFilterCount}
        >
          <EquipmentMobileFilter filterState={filterState} onFilterChange={handleFilterChange} />
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
        <VariableHeader
          title="Equipment & Rentals"
          subtitle="Manage owned and rented equipment inventory."
          Icon={Truck}
          color="green"
          onBack={() => navigate('/inventory')}
          rightAction={{ label: 'Add Equipment', onClick: handleAddEquipment, Icon: Plus }}
        />
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
      <VariableHeader
        title="Equipment & Rentals"
        subtitle="Manage owned and rented equipment inventory."
        Icon={Truck}
        color="green"
        onBack={() => navigate('/inventory')}
        rightAction={{ label: 'Add Equipment', onClick: handleAddEquipment, Icon: Plus }}
      />
      <EquipmentSearchFilter
        filterState={filterState}
        onFilterChange={handleFilterChange}
        dataRefreshTrigger={dataRefreshTrigger + reloadTrigger}
        onEquipmentChange={handleEquipmentChange}
        onLoadingChange={handleLoadingChange}
        onErrorChange={handleErrorChange}
        onCategoryUpdated={handleCategoryUpdate}
        desktopPagination
      />
      <EquipmentTable
        equipment={equipment}
        onEditEquipment={handleEditEquipment}
        onDeleteEquipment={handleDeleteEquipment}
        onViewEquipment={handleViewEquipment}
        onDuplicateEquipment={handleDuplicateEquipment}
        loading={loading}
        totalCount={totalCount}
        pageNumber={pageCursors.length}
        hasPrevious={pageCursors.length > 1}
        hasMore={!!nextCursor}
        onPrevious={() => setPageCursors(prev => prev.slice(0, -1))}
        onNext={() => nextCursor && setPageCursors(prev => [...prev, nextCursor])}
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
