import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ToolsHeader from './components/ToolsHeader';
import ToolsSearchFilter from './components/ToolSearchFilter';
import ToolTable from './components/ToolsTable';
import ToolModal from './components/toolModal/ToolModal';
import { deleteToolItem, type ToolItem } from '../../../services/inventory/tools';
import { useIsMobile } from '../../../mobile/inventory/useIsMobile';
import MobilePageHeader from '../../../mobile/inventory/MobilePageHeader';
import MobileSearchBar from '../../../mobile/inventory/MobileSearchBar';
import MobileFilterSheet from '../../../mobile/inventory/MobileFilterSheet';
import MobileCardList from '../../../mobile/inventory/MobileCardList';
import MobileItemCard, { type CardField, type CardBadge } from '../../../mobile/inventory/MobileItemCard';

const matchesAllWords = (tool: ToolItem, term: string): boolean => {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [
    tool.name, tool.description,
    tool.tradeName ?? tool.trade,
    tool.sectionName ?? tool.section,
    tool.categoryName ?? tool.category,
    tool.subcategoryName ?? tool.subcategory,
    tool.brand
  ]
    .map(v => v ?? '')
    .join(' ')
    .toLowerCase();
  return words.every(word => haystack.includes(word));
};

const Tools: React.FC = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [modalTitle, setModalTitle] = useState<string | undefined>(undefined);

  const [filterState, setFilterState] = useState({
    searchTerm: '',
    tradeFilter: '',
    sectionFilter: '',
    categoryFilter: '',
    subcategoryFilter: '',
    statusFilter: '',
    sortBy: 'name'
  });

  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const [mobileSearchTerm, setMobileSearchTerm] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const handleToolsChange = useCallback((t: ToolItem[]) => setTools(t), []);
  const handleLoadingChange = useCallback((v: boolean) => setLoading(v), []);
  const handleErrorChange = useCallback((v: string | null) => setError(v), []);
  const handleFilterChange = useCallback((s: typeof filterState) => setFilterState(s), []);
  const handleCategoryUpdate = () => setReloadTrigger(prev => prev + 1);

  const handleAddTool = () => { setSelectedTool(null); setModalMode('create'); setModalTitle(undefined); setIsModalOpen(true); };
  const handleEditTool = (tool: ToolItem) => { setSelectedTool(tool); setModalMode('edit'); setModalTitle(undefined); setIsModalOpen(true); };
  const handleViewTool = (tool: ToolItem) => { setSelectedTool(tool); setModalMode('view'); setModalTitle(undefined); setIsModalOpen(true); };

  const handleDuplicateTool = (tool: ToolItem) => {
    const getUniqueName = (name: string) => {
      const match = name.match(/^(.*?)\s*\((\d+)\)$/);
      return match ? `${match[1]} (${parseInt(match[2]) + 1})` : `${name} (1)`;
    };
    setSelectedTool({ ...tool, id: undefined, name: getUniqueName(tool.name), purchaseDate: new Date().toISOString().split('T')[0] });
    setModalMode('create');
    setModalTitle('Duplicate Tool');
    setIsModalOpen(true);
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!window.confirm('Are you sure you want to delete this tool? This action cannot be undone.')) return;
    try {
      const result = await deleteToolItem(toolId);
      if (result.success) {
        setTools(prev => prev.filter(t => t.id !== toolId));
        setDataRefreshTrigger(prev => prev + 1);
      } else {
        alert(result.error || 'Failed to delete tool.');
      }
    } catch (err: any) {
      alert(err?.message || 'An unexpected error occurred.');
    }
  };

  const handleModalSave = () => { setIsModalOpen(false); setSelectedTool(null); setModalTitle(undefined); setDataRefreshTrigger(prev => prev + 1); };
  const handleModalClose = () => { setIsModalOpen(false); setSelectedTool(null); setModalTitle(undefined); };
  const handleRetry = () => { setError(null); setLoading(true); setDataRefreshTrigger(prev => prev + 1); };

  const activeFilterCount = useMemo(() => [
    filterState.tradeFilter, filterState.sectionFilter, filterState.categoryFilter,
    filterState.subcategoryFilter, filterState.statusFilter
  ].filter(Boolean).length, [filterState]);

  const getStatusBadge = (tool: ToolItem): CardBadge => {
    const s = (tool.status || '').toLowerCase();
    if (s === 'available') return { label: 'Available', color: 'green' };
    if (s === 'in use') return { label: 'In Use', color: 'orange' };
    if (s === 'maintenance') return { label: 'Maintenance', color: 'yellow' };
    return { label: tool.status || 'Unknown', color: 'gray' };
  };

  const getCardFields = (tool: ToolItem): CardField[] => [
    { label: 'Trade', value: tool.trade || '—' },
    { label: 'Category', value: tool.category || '—' },
    { label: 'Value', value: tool.minimumCustomerCharge ? `$${tool.minimumCustomerCharge.toFixed(2)}` : '—', valueColor: 'orange' },
    { label: 'Location', value: tool.location || '—' }
  ];

  const mobileTools = useMemo(() => {
    if (!mobileSearchTerm) return tools;
    return tools.filter(t => matchesAllWords(t, mobileSearchTerm));
  }, [tools, mobileSearchTerm]);

  // ── Mobile layout ──────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobilePageHeader
          title="Tools"
          itemCount={mobileTools.length}
          onAdd={handleAddTool}
          onBack={() => navigate('/inventory')}
        />

        <MobileSearchBar
          value={mobileSearchTerm}
          onChange={setMobileSearchTerm}
          onOpenFilters={() => setIsFilterSheetOpen(true)}
          activeFilterCount={activeFilterCount}
          placeholder="Search tools..."
        />

        <MobileCardList
          loading={loading}
          error={error}
          isEmpty={!loading && mobileTools.length === 0}
          emptyMessage="No tools found"
          emptySubMessage="Try adjusting your filters or add a tool."
          onRetry={handleRetry}
        >
          {mobileTools.map(tool => (
            <MobileItemCard
              key={tool.id}
              id={tool.id!}
              title={tool.name}
              subtitle={tool.description}
              imageUrl={tool.imageUrl}
              badge={getStatusBadge(tool)}
              fields={getCardFields(tool)}
              onView={id => navigate(`/tools/${id}/detail`)}
            />
          ))}
        </MobileCardList>

        {/* Hidden filter — mounted immediately so data loads on page open */}
        <div className="sr-only">
          <ToolsSearchFilter
            filterState={filterState}
            onFilterChange={handleFilterChange}
            dataRefreshTrigger={dataRefreshTrigger + reloadTrigger}
            onToolsChange={handleToolsChange}
            onLoadingChange={handleLoadingChange}
            onErrorChange={handleErrorChange}
            onCategoryUpdated={handleCategoryUpdate}
          />
        </div>

        <MobileFilterSheet
          isOpen={isFilterSheetOpen}
          onClose={() => setIsFilterSheetOpen(false)}
          onClear={() => handleFilterChange({ searchTerm: '', tradeFilter: '', sectionFilter: '', categoryFilter: '', subcategoryFilter: '', statusFilter: '', sortBy: 'name' })}
          activeFilterCount={activeFilterCount}
        >
          <p className="text-sm text-gray-500 text-center py-4">
            Advanced filters coming soon. Use search to narrow results.
          </p>
        </MobileFilterSheet>

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
  }

  // ── Desktop layout (unchanged) ─────────────────────────────────
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
          <button onClick={handleRetry} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ToolsHeader onAddTool={handleAddTool} />
      <ToolsSearchFilter
        filterState={filterState}
        onFilterChange={handleFilterChange}
        dataRefreshTrigger={dataRefreshTrigger + reloadTrigger}
        onToolsChange={handleToolsChange}
        onLoadingChange={handleLoadingChange}
        onErrorChange={handleErrorChange}
        onCategoryUpdated={handleCategoryUpdate}
      />
      <ToolTable
        tools={tools}
        onEditTool={handleEditTool}
        onDeleteTool={handleDeleteTool}
        onViewTool={handleViewTool}
        onDuplicateTool={handleDuplicateTool}
        loading={loading}
      />
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