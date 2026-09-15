import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, Briefcase, Plus } from 'lucide-react';
import VariableHeader from '../../../mainComponents/ui/VariableHeader';
import { useAuthContext } from '../../../contexts/AuthContext';
import { getLaborItems, getLaborItemsPage, deleteLaborItem, type LaborItem } from '../../../services/inventory/labor';
import LaborFilter, { type LaborFilterState } from './components/LaborFilter';
import { LaborTable } from './components/LaborTable';
import { LaborCreationModal } from './components/LaborCreationModal';
import { Alert } from '../../../mainComponents/ui/Alert';
import UtilitiesModal, { type Utility } from '../../../mainComponents/inventory/UtilitiesModal'
import ClientPricingTemplates from './components/ClientPricingTemplates';
import { useIsMobile } from '../../../mobile/inventory/useIsMobile';
import MobilePageHeader from '../../../mobile/inventory/MobilePageHeader';
import MobileSearchBar from '../../../mobile/inventory/MobileSearchBar';
import MobileFilterSheet from '../../../mobile/inventory/MobileFilterSheet';
import LaborMobileFilter from '../../../mobile/inventory/filters/LaborMobileFilter';
import MobileCardList from '../../../mobile/inventory/MobileCardList';
import MobileItemCard, { type CardField, type CardBadge } from '../../../mobile/inventory/MobileItemCard';

const matchesAllWords = (item: LaborItem, term: string): boolean => {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [item.name, item.description, item.tradeName, item.sectionName, item.categoryName]
    .map(v => v ?? '')
    .join(' ')
    .toLowerCase();
  return words.every(word => haystack.includes(word));
};

export const Labor: React.FC = () => {
  const { currentUser } = useAuthContext();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [items, setItems] = useState<LaborItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<LaborItem | null>(null);
  const [viewOnly, setViewOnly] = useState(false);

  const [showUtilitiesModal, setShowUtilitiesModal] = useState(false);
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [showEmptyChecker, setShowEmptyChecker] = useState(false);
  const [showClientPricingTemplates, setShowClientPricingTemplates] = useState(false);

  const [filterState, setFilterState] = useState<LaborFilterState>({
    searchTerm: '',
    tradeId: '',
    sectionId: '',
    categoryId: '',
    tier: '',
    sortBy: 'name'
  });
  const [pageCursors, setPageCursors] = useState<(string | undefined)[]>([undefined]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const [mobileSearchTerm, setMobileSearchTerm] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const resetPage = useCallback(() => {
    setPageCursors([undefined]);
    setNextCursor(null);
  }, []);
  const handleFilterChange = useCallback((s: LaborFilterState) => {
    resetPage();
    setFilterState(s);
  }, [resetPage]);
  const handleCategoryUpdate = () => {
    resetPage();
    setReloadTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (!isMobile) return;
    const load = async () => {
      if (!currentUser?.uid) { setLoading(false); return; }
      setLoading(true);
      setError(null);
      try {
        const result = await getLaborItems(currentUser.uid, {
          tradeId: filterState.tradeId || undefined,
          sectionId: filterState.sectionId || undefined,
          categoryId: filterState.categoryId || undefined,
          searchTerm: filterState.searchTerm || undefined,
          tier: filterState.tier || undefined
        });
        if (result.success && result.data) {
          setItems(result.data);
        } else {
          setError(result.error || 'Failed to load labor items');
          setItems([]);
        }
      } catch {
        setError('An error occurred while loading labor items');
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser?.uid, filterState, reloadTrigger, isMobile]);

  useEffect(() => {
    if (isMobile) return;
    let active = true;
    const load = async () => {
      if (!currentUser?.uid) { if (active) setLoading(false); return; }
      setLoading(true);
      setError(null);
      const result = await getLaborItemsPage({
        tradeId: filterState.tradeId || undefined,
        sectionId: filterState.sectionId || undefined,
        categoryId: filterState.categoryId || undefined,
        searchTerm: filterState.searchTerm || undefined,
        tier: filterState.tier || undefined,
        sortBy: filterState.sortBy as 'name' | 'tradeName' | 'sectionName' | 'categoryName' | 'createdAt',
      }, pageCursors[pageCursors.length - 1]);
      if (!active) return;
      if (result.success && result.data) {
        setItems(result.data.items);
        setNextCursor(result.data.nextCursor);
        setTotalCount(result.data.totalCount);
      } else {
        setItems([]);
        setError(result.error || 'Failed to load labor items');
      }
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [currentUser?.uid, filterState, reloadTrigger, isMobile, pageCursors]);

  const getSortedItems = (items: LaborItem[]): LaborItem[] => {
    const sorted = [...items];
    switch (filterState.sortBy) {
      case 'name': return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'tradeName': return sorted.sort((a, b) => (a.tradeName || '').localeCompare(b.tradeName || ''));
      case 'sectionName': return sorted.sort((a, b) => (a.sectionName || '').localeCompare(b.sectionName || ''));
      case 'categoryName': return sorted.sort((a, b) => (a.categoryName || '').localeCompare(b.categoryName || ''));
      case 'createdAt': return sorted.sort((a, b) => {
        const aD = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
        const bD = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
        return bD - aD;
      });
      default: return sorted;
    }
  };

  const displayItems = isMobile ? getSortedItems(items) : items;

  const handleAddNew = () => { setEditingItem(null); setViewOnly(false); setShowModal(true); };
  const handleView = (item: LaborItem) => { setEditingItem(item); setViewOnly(true); setShowModal(true); };
  const handleEdit = (item: LaborItem) => { setEditingItem(item); setViewOnly(false); setShowModal(true); };

  const handleDuplicate = (item: LaborItem) => {
    const baseMatch = item.name.match(/^(.+?)(?:\s*\((\d+)\))?$/);
    const base = baseMatch ? baseMatch[1].trim() : item.name;
    const nums = items
      .filter(i => { const m = i.name.match(/^(.+?)(?:\s*\((\d+)\))?$/); return m ? m[1].trim() === base : false; })
      .map(i => { const m = i.name.match(/\((\d+)\)$/); return m ? parseInt(m[1], 10) : 0; })
      .filter(n => n > 0);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    setEditingItem({ ...item, id: undefined, name: `${base} (${next})`, createdAt: undefined, updatedAt: undefined });
    setViewOnly(false);
    setShowModal(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this labor item? This action cannot be undone.')) return;
    try {
      const result = await deleteLaborItem(itemId);
      if (result.success) {
        resetPage();
        setReloadTrigger(prev => prev + 1);
        setError(null);
      } else {
        setError(result.error || 'Failed to delete labor item');
      }
    } catch {
      setError('An error occurred while deleting the labor item');
    }
  };

  const handleSave = (saved: LaborItem) => {
    if (isMobile && editingItem?.id) {
      setItems(items.map(i => i.id === saved.id ? saved : i));
    } else if (isMobile) {
      setItems([...items, saved]);
    }
    if (!isMobile) {
      resetPage();
      setReloadTrigger(prev => prev + 1);
    }
    setEditingItem(null);
    setViewOnly(false);
    setError(null);
  };

  const handleCloseModal = () => { setShowModal(false); setEditingItem(null); setViewOnly(false); };

  const activeFilterCount = useMemo(() => [
    filterState.tradeId, filterState.sectionId, filterState.categoryId, filterState.tier
  ].filter(Boolean).length, [filterState]);

  const getTierBadge = (item: LaborItem): CardBadge => {
    const color = item.tier === 'senior' ? 'blue' : item.tier === 'junior' ? 'green' : 'gray';
    return { label: item.tier ? item.tier.charAt(0).toUpperCase() + item.tier.slice(1) : 'Standard', color };
  };

  const getCardFields = (item: LaborItem): CardField[] => {
    const rate = item.flatRates?.[0]?.rate
      ? `$${item.flatRates[0].rate.toFixed(2)}`
      : item.hourlyRates?.[0]?.hourlyRate
        ? `$${item.hourlyRates[0].hourlyRate.toFixed(2)}/hr`
        : '—';
    return [
      { label: 'Trade', value: item.tradeName || '—' },
      { label: 'Category', value: item.categoryName || '—' },
      { label: 'Rate', value: rate, valueColor: 'orange' },
      { label: 'Section', value: item.sectionName || '—' }
    ];
  };

  const mobileItems = useMemo(() => {
    if (!mobileSearchTerm) return displayItems;
    return displayItems.filter(i => matchesAllWords(i, mobileSearchTerm));
  }, [displayItems, mobileSearchTerm]);

  const laborUtilities: Utility[] = [
    {
      id: 'client-pricing-templates',
      title: 'Client Pricing Templates',
      description: 'Create reusable pricing rule templates and apply them across trades, sections, or categories',
      icon: LayoutTemplate,
      onClick: () => setShowClientPricingTemplates(true),
      available: true,
    },
  ];

  // ── Mobile layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobilePageHeader
          title="Labor"
          itemCount={mobileItems.length}
          onAdd={handleAddNew}
          onBack={() => navigate('/inventory')}
        />

        <MobileSearchBar
          value={mobileSearchTerm}
          onChange={setMobileSearchTerm}
          onOpenFilters={() => setIsFilterSheetOpen(true)}
          activeFilterCount={activeFilterCount}
          placeholder="Search labor items..."
        />

        <MobileCardList
          loading={loading}
          error={error}
          isEmpty={!loading && mobileItems.length === 0}
          emptyMessage="No labor items found"
          emptySubMessage="Try adjusting your filters or add a labor item."
          onRetry={() => setReloadTrigger(p => p + 1)}
        >
          {mobileItems.map(item => (
            <MobileItemCard
              key={item.id}
              id={item.id!}
              title={item.name}
              subtitle={item.description}
              badge={getTierBadge(item)}
              fields={getCardFields(item)}
              onView={id => navigate(`/labor/${id}/detail`)}
            />
          ))}
        </MobileCardList>

        <MobileFilterSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          onClear={() => handleFilterChange({ searchTerm: '', tradeId: '', sectionId: '', categoryId: '', tier: '', sortBy: 'name' })}
          activeFilterCount={activeFilterCount}
        >
          <LaborMobileFilter filterState={filterState} onFilterChange={handleFilterChange} />
        </MobileFilterSheet>

        {showModal && (
          <LaborCreationModal
            item={editingItem}
            viewOnly={viewOnly}
            onClose={handleCloseModal}
            onSave={handleSave}
          />
        )}
      </div>
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <VariableHeader
        title="Labor Management"
        subtitle="Manage flat rates, hourly rates, and task orders for your projects."
        Icon={Briefcase}
        color="purple"
        onBack={() => navigate('/inventory')}
        rightAction={{ label: 'Add Labor Item', onClick: handleAddNew, Icon: Plus }}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
          <LaborFilter
            filterState={filterState}
            onFilterChange={handleFilterChange}
            onCategoryUpdated={handleCategoryUpdate}
            onUtilitiesClick={() => setShowUtilitiesModal(true)}
          />
          <LaborTable
            items={displayItems}
            loading={loading}
            totalCount={totalCount}
            pageNumber={pageCursors.length}
            hasPrevious={pageCursors.length > 1}
            hasMore={Boolean(nextCursor)}
            onPrevious={() => setPageCursors(cursors => cursors.slice(0, -1))}
            onNext={() => nextCursor && setPageCursors(cursors => [...cursors, nextCursor])}
            onView={handleView}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {showModal && (
        <LaborCreationModal
          item={editingItem}
          viewOnly={viewOnly}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      <UtilitiesModal
        isOpen={showUtilitiesModal}
        onClose={() => setShowUtilitiesModal(false)}
        onCategoryManagerClick={() => setShowCategoryEditor(true)}
        onEmptyCategoryCheckClick={() => setShowEmptyChecker(true)}
        moduleName="Labor"
        additionalUtilities={laborUtilities}
      />

      <ClientPricingTemplates
        isOpen={showClientPricingTemplates}
        onClose={() => setShowClientPricingTemplates(false)}
      />
    </div>
  );
};

export default Labor;
