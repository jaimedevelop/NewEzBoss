import React, { useState } from 'react';
import { X, Search, Store, ChevronRight, Loader2 } from 'lucide-react';
import { searchStoreProducts, type StoreResult } from '../../../../../services/inventory/store';

interface StoreResult {
    itemId: string;
    name: string;
    brand: string;
    description: string;
    price: number;
    sku: string;
    imageUrl?: string;
    store: string;
}

interface AddFromStoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddProducts: (products: StoreResult[]) => void;
}

const AVAILABLE_STORES = [
    { id: 'home_depot', label: 'Home Depot', color: 'orange' },
    { id: 'lowes', label: "Lowe's", color: 'blue' },
];

const storeColors: Record<string, string> = {
    orange: 'border-orange-400 bg-orange-50 text-orange-700',
    blue: 'border-blue-400 bg-blue-50 text-blue-700',
};

const storeCheckColors: Record<string, string> = {
    orange: 'border-orange-400 bg-orange-500',
    blue: 'border-blue-400 bg-blue-500',
};

const AddFromStoreModal: React.FC<AddFromStoreModalProps> = ({
    isOpen,
    onClose,
    onAddProducts,
}) => {
    const [selectedStores, setSelectedStores] = useState<string[]>(['home_depot']);
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<StoreResult[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const toggleStore = (storeId: string) => {
        setSelectedStores(prev =>
            prev.includes(storeId) ? prev.filter(s => s !== storeId) : [...prev, storeId]
        );
    };

    const toggleItem = (itemId: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            next.has(itemId) ? next.delete(itemId) : next.add(itemId);
            return next;
        });
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        if (selectedStores.length === 0) {
            setError('Please select at least one store.');
            return;
        }

        setError('');
        setIsSearching(true);
        setHasSearched(false);
        setResults([]);
        setSelectedItems(new Set());

        try {
            const data = await searchStoreProducts({
                query: searchQuery,
                stores: selectedStores as SupportedStore[],
            });
            setResults(data.results);
            if (data.errors.length > 0) {
                setError(`Some stores failed to load: ${data.errors.map(e => e.storeName).join(', ')}`);
            }
        } catch (err) {
            setError('Failed to search for products. Please try again.');
        } finally {
            setIsSearching(false);
            setHasSearched(true);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleAdd = () => {
        const toAdd = results.filter(r => selectedItems.has(r.itemId));
        onAddProducts(toAdd);
        onClose();
    };

    const handleClose = () => {
        setSearchQuery('');
        setResults([]);
        setSelectedItems(new Set());
        setHasSearched(false);
        setError('');
        onClose();
    };

    const groupedResults = AVAILABLE_STORES.reduce<Record<string, StoreResult[]>>((acc, store) => {
        acc[store.id] = results.filter(r => r.store === store.id);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-900">Add From Store</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {/* Store selector */}
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Select Stores</p>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_STORES.map(store => {
                                const active = selectedStores.includes(store.id);
                                return (
                                    <button
                                        key={store.id}
                                        onClick={() => toggleStore(store.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-colors ${active ? storeColors[store.color] : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center transition-colors ${active ? storeCheckColors[store.color] : 'border-gray-300'
                                                }`}
                                        >
                                            {active && (
                                                <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 8 8">
                                                    <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            )}
                                        </span>
                                        {store.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Search bar */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search for a product, e.g. 1/2 galvanized floor flange"
                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery.trim()}
                            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Search
                        </button>
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    {/* Results */}
                    <div className="min-h-[200px]">
                        {isSearching && (
                            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <p className="text-sm">Searching stores...</p>
                            </div>
                        )}

                        {!isSearching && hasSearched && results.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                <Store className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-sm">No results found. Try a different search term.</p>
                            </div>
                        )}

                        {!isSearching && !hasSearched && (
                            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                                <Search className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-sm">Search for products above to see results.</p>
                            </div>
                        )}

                        {!isSearching && results.length > 0 && (
                            <div className="flex flex-col gap-6">
                                {AVAILABLE_STORES.filter(s => selectedStores.includes(s.id)).map(store => {
                                    const storeResults = groupedResults[store.id];
                                    if (!storeResults?.length) return null;
                                    return (
                                        <div key={store.id}>
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                                {store.label}
                                            </p>
                                            <div className="flex flex-col gap-2">
                                                {storeResults.map(item => {
                                                    const checked = selectedItems.has(item.itemId);
                                                    return (
                                                        <button
                                                            key={item.itemId}
                                                            onClick={() => toggleItem(item.itemId)}
                                                            className={`flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-colors ${checked
                                                                ? 'border-blue-400 bg-blue-50'
                                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {/* Thumbnail */}
                                                            <div className="w-12 h-12 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                                                                {item.imageUrl ? (
                                                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                        <Store className="w-5 h-5" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                                                                <p className="text-xs text-gray-500 truncate">{item.brand} · SKU: {item.sku}</p>
                                                                <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>
                                                            </div>

                                                            {/* Price + check */}
                                                            <div className="flex items-center gap-3 flex-shrink-0">
                                                                <p className="text-sm font-semibold text-gray-900">${item.price.toFixed(2)}</p>
                                                                <div
                                                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                                                        }`}
                                                                >
                                                                    {checked && (
                                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 8 8">
                                                                            <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                                        </svg>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        {selectedItems.size > 0 ? `${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''} selected` : 'No items selected'}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={selectedItems.size === 0}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            Add Selected
                            {selectedItems.size > 0 && (
                                <span className="bg-white text-blue-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                    {selectedItems.size}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddFromStoreModal;