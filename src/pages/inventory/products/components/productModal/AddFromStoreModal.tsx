import ModalPortal from '../../../../../mainComponents/ui/ModalPortal';
import { EzBossLoader } from '../../../../../mainComponents/ui/EzBossLoader';
import BusinessActionButton from '../../../../../mainComponents/ui/BusinessActionButton';
import React, { useState } from 'react';
import { X, Search, Store, } from 'lucide-react';
import { searchStoreProducts, type StoreResult } from '../../../../../services/inventory/store';



interface AddFromStoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddProducts: (products: StoreResult[]) => void;
}

const AddFromStoreModal: React.FC<AddFromStoreModalProps> = ({
    isOpen,
    onClose,
    onAddProducts,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<StoreResult[]>([]);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [storeUrl, setStoreUrl] = useState<string>();
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSearch = async () => {
        if (isSearching || !searchQuery.trim()) return;
        setError('');
        setStoreUrl(undefined);
        setIsSearching(true);
        setHasSearched(false);
        setResults([]);
        setSelectedItemId(null);

        try {
            const data = await searchStoreProducts({
                query: searchQuery,
                stores: ['home_depot'],
            });
            setResults(data.results);
            if (data.errors.length > 0) {
                setError(data.errors[0].message);
                setStoreUrl(data.errors[0].storeUrl);
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
        const toAdd = results.filter(r => r.itemId === selectedItemId);
        onAddProducts(toAdd);
        handleClose();
    };

    const handleClose = () => {
        setSearchQuery('');
        setResults([]);
        setSelectedItemId(null);
        setHasSearched(false);
        setError('');
        setStoreUrl(undefined);
        onClose();
    };

    return (
        <ModalPortal>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl my-8 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-orange-600" />
                        <h2 className="text-xl font-semibold text-gray-900">Add From Store</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-6">
                    {/* Search bar */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                aria-label="Home Depot product name, SKU, or link"
                                placeholder="Product name, SKU, or Home Depot link"
                                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isSearching || !searchQuery.trim()}
                            className="px-4 py-2.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {isSearching ? <EzBossLoader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            Search
                        </button>
                    </div>

                    {storeUrl && (
                        <div className="text-sm text-gray-700">
                            <a href={storeUrl} target="_blank" rel="noreferrer" className="font-semibold text-orange-700 underline">
                                Open in Home Depot
                            </a>
                            <p className="mt-1">On desktop Chrome, use the EzBoss Importer to collect supplier details from the product tab.</p>
                        </div>
                    )}
                    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

                    {/* Results */}
                    <div className="min-h-[200px]">
                        {isSearching && (
                            <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-500">
                                <EzBossLoader className="w-6 h-6 animate-spin" />
                                <p className="text-sm">Searching Home Depot…</p>
                            </div>
                        )}

                        {!isSearching && hasSearched && !error && results.length === 0 && (
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
                                <div className="flex flex-col gap-2">
                                    {results.map(item => {
                                        const checked = item.itemId === selectedItemId;
                                        return (
                                            <button
                                                key={item.itemId}
                                                aria-pressed={checked}
                                                onClick={() => setSelectedItemId(checked ? null : item.itemId)}
                                                className={`flex items-center gap-3 p-3 border-2 rounded-lg text-left transition-colors ${checked
                                                    ? 'border-orange-400 bg-orange-50'
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
                                                    <p className="text-xs text-gray-500 truncate">{[item.brand, item.storeSku ? `Store SKU ${item.storeSku}` : `Internet # ${item.internetNumber ?? item.sku}`, item.modelNumber && `Model ${item.modelNumber}`].filter(Boolean).join(' · ')}</p>
                                                    <p className="text-xs text-gray-400 truncate mt-0.5">{item.description}</p>
                                                    {item.existingProductId && <p className="text-xs text-blue-700">Already in inventory</p>}
                                                </div>

                                                {/* Price + check */}
                                                <div className="flex items-center gap-3 flex-shrink-0">
                                                    <p className="text-sm font-semibold text-gray-900">{item.price == null ? 'Price unavailable' : `$${item.price.toFixed(2)}`}</p>
                                                    <div
                                                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
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
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        {selectedItemId ? '1 item selected' : 'No item selected'}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <BusinessActionButton
                            onClick={handleAdd}
                            disabled={!selectedItemId}
                            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2" capability="write:inventory"
                        >
                            {results.find(item => item.itemId === selectedItemId)?.existingProductId ? 'Review existing' : 'Review product'}
                        </BusinessActionButton>
                    </div>
                </div>
            </div>
        </div>
        </ModalPortal>
    );
};

export default AddFromStoreModal;
