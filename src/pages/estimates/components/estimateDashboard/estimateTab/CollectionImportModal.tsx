// src/pages/estimates/components/estimateDashboard/CollectionImportModal.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, FolderOpen, Package, Briefcase, Wrench, Truck, ChevronRight, ChevronDown, Search, ImageOff } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { getCollection, getCollections } from '../../../../../services/collections';
import type { Collection } from '../../../../../services/collections/collections.types';
import { convertCollectionToLineItems, getCollectionImportInventory } from '../../../../../services/estimates/estimates.inventory';
import { formatCurrency } from '../../../../../services/estimates';
import type { LineItem } from '../../../../../services/estimates';

interface CollectionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: LineItem[]) => void | Promise<void>;
}

type CollectionDetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; collection: Collection };

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : typeof error === 'string' ? error : fallback;

const CollectionCoverThumbnail: React.FC<{ src?: string; name: string }> = ({ src, name }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
      {src && !failed ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <ImageOff aria-label={`${name} has no available cover image`} className="m-auto h-full w-5 text-gray-400" />
      )}
    </div>
  );
};

export const CollectionImportModal: React.FC<CollectionImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const { currentUser } = useAuthContext();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [detailsById, setDetailsById] = useState<Record<string, CollectionDetailState>>({});
  const [listError, setListError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const session = useRef(0);
  const detailRequests = useRef(new Set<string>());
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Load collections
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;

    const requestSession = ++session.current;
    setCollections([]);
    setDetailsById({});
    setExpandedId(null);
    detailRequests.current.clear();
    setListError(null);

    const loadCollections = async () => {
      setIsLoading(true);
      try {
        // The API derives the numeric database user ID from the authenticated
        // Auth0 subject. Passing `currentUser.uid` here would send that string
        // as `?userId=...`, but `collections.userId` is an integer.
        const result = await getCollections();
        if (session.current !== requestSession) return;
        if (result.success && result.data) {
          setCollections(result.data);
        } else {
          setListError(getErrorMessage(result.error, 'Could not load collections.'));
        }
      } catch (error) {
        console.error('Error loading collections:', error);
        if (session.current === requestSession) {
          setListError(getErrorMessage(error, 'Could not load collections.'));
        }
      } finally {
        if (session.current === requestSession) setIsLoading(false);
      }
    };

    void loadCollections();
    const invalidateSession = () => { session.current++; };
    return invalidateSession;
  }, [isOpen, currentUser?.uid, reloadCount]);

  const loadDetail = useCallback(async (collectionId: string) => {
    if (detailRequests.current.has(collectionId)) return;
    const requestSession = session.current;
    detailRequests.current.add(collectionId);
    setDetailsById(prev => ({ ...prev, [collectionId]: { status: 'loading' } }));
    try {
      const result = await getCollection(collectionId);
      if (session.current !== requestSession) return;
      setDetailsById(prev => ({
        ...prev,
        [collectionId]: result.success && result.data
          ? { status: 'ready', collection: result.data }
          : { status: 'error', message: getErrorMessage(result.error, 'Could not load collection details.') }
      }));
    } catch (error) {
      console.error('Error loading collection details:', error);
      if (session.current === requestSession) {
        setDetailsById(prev => ({
          ...prev,
          [collectionId]: { status: 'error', message: getErrorMessage(error, 'Could not load collection details.') }
        }));
      }
    } finally {
      if (session.current === requestSession) detailRequests.current.delete(collectionId);
    }
  }, []);

  useEffect(() => {
    if (isOpen && expandedId && !detailsById[expandedId]) {
      void loadDetail(expandedId);
    }
  }, [isOpen, expandedId, detailsById, loadDetail]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setExpandedId(null);
    }
  }, [isOpen]);

  // Filter collections by search
  const filteredCollections = collections.filter(col =>
    col.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    col.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate counts for a collection
  const getCollectionCounts = (collection: Collection) => {
    const counts = {
      products: 0,
      labor: 0,
      tools: 0,
      equipment: 0,
      total: 0
    };

    // Count products
    if (collection.productSelections) {
      counts.products = Object.values(collection.productSelections).filter(s => s.isSelected).length;
    }

    // Count labor
    if (collection.laborSelections) {
      counts.labor = Object.values(collection.laborSelections).filter(s => s.isSelected).length;
    }

    // Count tools
    if (collection.toolSelections) {
      counts.tools = Object.values(collection.toolSelections).filter(s => s.isSelected).length;
    }

    // Count equipment
    if (collection.equipmentSelections) {
      counts.equipment = Object.values(collection.equipmentSelections).filter(s => s.isSelected).length;
    }

    counts.total = counts.products + counts.labor + counts.tools + counts.equipment;

    return counts;
  };

  // Calculate the total value of all selected items in a collection.
  const getCollectionValue = (collection: Collection) => {
    let total = 0;

    if (collection.productSelections) {
      Object.values(collection.productSelections).forEach(s => {
        if (s.isSelected) {
          total += (s.quantity || 1) * (s.unitPrice || 0);
        }
      });
    }

    if (collection.laborSelections) {
      Object.values(collection.laborSelections).forEach(s => {
        if (s.isSelected) {
          total += (s.quantity || 1) * (s.unitPrice || 0);
        }
      });
    }

    if (collection.toolSelections) {
      Object.values(collection.toolSelections).forEach(s => {
        if (s.isSelected) {
          total += (s.quantity || 1) * (s.unitPrice || 0);
        }
      });
    }

    if (collection.equipmentSelections) {
      Object.values(collection.equipmentSelections).forEach(s => {
        if (s.isSelected) {
          total += (s.quantity || 1) * (s.unitPrice || 0);
        }
      });
    }

    return total;
  };

  const handleToggleExpand = (collectionId: string) => {
    setExpandedId(expandedId === collectionId ? null : collectionId);
  };

  const handleImport = async (collectionId: string) => {
    const detail = detailsById[collectionId];
    if (detail?.status !== 'ready') return;
    setImportingId(collectionId);
    setImportError(null);
    try {
      const inventory = await getCollectionImportInventory(detail.collection);
      const lineItems = convertCollectionToLineItems(detail.collection, inventory);
      await onImport(lineItems);
      onClose();
    } catch (error) {
      setImportError(getErrorMessage(error, 'Could not load current inventory pricing.'));
    } finally {
      setImportingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-6 w-6 text-orange-600" />
            <h2 className="text-xl font-semibold">Import Collection</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search collections..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        {/* Collections List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              Loading collections...
            </div>
          ) : listError ? (
            <div className="text-center py-12" role="alert">
              <p className="text-red-700">{listError}</p>
              <button onClick={() => setReloadCount(count => count + 1)} className="mt-3 text-orange-700 hover:underline">
                Retry
              </button>
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No collections found matching your search' : 'No collections available'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCollections.map(collection => {
                const detail = collection.id ? detailsById[collection.id] : undefined;
                const detailedCollection = detail?.status === 'ready' ? detail.collection : null;
                const counts = detailedCollection ? getCollectionCounts(detailedCollection) : null;
                const isExpanded = expandedId === collection.id;
                // The list endpoint carries a persisted save-time total, so the
                // header never needs to load every collection's selections.
                const estimatedValue = collection.savedEstimatedValue
                  ?? (detailedCollection ? getCollectionValue(detailedCollection) : null);

                return (
                  <div
                    key={collection.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Collection Header */}
                    <button
                      onClick={() => collection.id && handleToggleExpand(collection.id)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
                        )}
                        <CollectionCoverThumbnail src={collection.coverImageUrl} name={collection.name} />
                        <div className="min-w-0 text-left">
                          <div className="font-medium">{collection.name}</div>
                          {collection.description && (
                            <div className="truncate text-sm text-gray-500">{collection.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 whitespace-nowrap text-right">
                        <div className="text-sm font-medium">
                          {counts ? counts.total : collection.itemCount ?? '—'} items
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {estimatedValue === null ? '—' : formatCurrency(estimatedValue ?? 0)}
                        </div>
                      </div>
                    </button>

                    {/* Expanded Preview */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4 space-y-4">
                        {detail?.status === 'error' && (
                          <div role="alert" className="text-sm text-red-700">
                            <p>{detail.message}</p>
                            <button onClick={() => collection.id && void loadDetail(collection.id)} className="mt-2 text-orange-700 hover:underline">
                              Retry loading details
                            </button>
                          </div>
                        )}
                        {!detailedCollection && detail?.status !== 'error' && (
                          <p className="text-sm text-gray-600" role="status">Loading collection details...</p>
                        )}
                        {detailedCollection && counts && (
                          <>
                        {/* Breakdown */}
                        <div className="grid grid-cols-4 gap-4">
                          {counts.products > 0 && (
                            <div className="text-center">
                              <Package className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                              <div className="text-sm font-medium">{counts.products}</div>
                              <div className="text-xs text-gray-500">Products</div>
                            </div>
                          )}
                          {counts.labor > 0 && (
                            <div className="text-center">
                              <Briefcase className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                              <div className="text-sm font-medium">{counts.labor}</div>
                              <div className="text-xs text-gray-500">Labor</div>
                            </div>
                          )}
                          {counts.tools > 0 && (
                            <div className="text-center">
                              <Wrench className="h-5 w-5 text-orange-600 mx-auto mb-1" />
                              <div className="text-sm font-medium">{counts.tools}</div>
                              <div className="text-xs text-gray-500">Tools</div>
                            </div>
                          )}
                          {counts.equipment > 0 && (
                            <div className="text-center">
                              <Truck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                              <div className="text-sm font-medium">{counts.equipment}</div>
                              <div className="text-xs text-gray-500">Equipment</div>
                            </div>
                          )}
                        </div>

                        {/* Value */}
                        <div className="border-t pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Estimated Value:</span>
                            <span className="text-lg font-semibold text-gray-900">
                              {formatCurrency(estimatedValue)}
                            </span>
                          </div>
                        </div>

                        {/* Import Button */}
                        {importError && (
                          <p className="text-sm text-red-700" role="alert">{importError}</p>
                        )}
                        <button
                          onClick={() => collection.id && void handleImport(collection.id)}
                          disabled={!detailedCollection || importingId !== null}
                          className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                        >
                          {importingId === collection.id ? 'Loading current prices...' : 'Import Collection'}
                        </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
