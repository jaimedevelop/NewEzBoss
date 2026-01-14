// src/pages/estimates/components/estimateDashboard/CollectionImportModal.tsx

import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Package, Briefcase, Wrench, Truck, ChevronRight, ChevronDown, Search } from 'lucide-react';
import { useAuthContext } from '../../../../../contexts/AuthContext';
import { getCollections } from '../../../../../services/collections';
import { convertCollectionToLineItems } from '../../../../../services/estimates/estimates.inventory';
import { formatCurrency } from '../../../../../services/estimates';
import type { LineItem } from '../../../../../services/estimates';

interface CollectionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: LineItem[]) => void;
}

export const CollectionImportModal: React.FC<CollectionImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const { currentUser } = useAuthContext();
  const [collections, setCollections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState({
    products: true,
    labor: true,
    tools: true,
    equipment: true
  });

  // Load collections
  useEffect(() => {
    if (!isOpen || !currentUser?.uid) return;

    const loadCollections = async () => {
      setIsLoading(true);
      try {
        const result = await getCollections(currentUser.uid);
        if (result.success && result.data) {
          setCollections(result.data);
        }
      } catch (error) {
        console.error('Error loading collections:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCollections();
  }, [isOpen, currentUser?.uid]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setExpandedId(null);
      setSelectedTypes({
        products: true,
        labor: true,
        tools: true,
        equipment: true
      });
    }
  }, [isOpen]);

  // Filter collections by search
  const filteredCollections = collections.filter(col =>
    col.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    col.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate counts for a collection
  const getCollectionCounts = (collection: any) => {
    const counts = {
      products: 0,
      labor: 0,
      tools: 0,
      equipment: 0,
      total: 0
    };

    // Count products
    if (collection.productSelections) {
      counts.products = Object.values(collection.productSelections).filter(
        (s: any) => s.isSelected
      ).length;
    }

    // Count labor
    if (collection.laborSelections) {
      counts.labor = Object.values(collection.laborSelections).filter(
        (s: any) => s.isSelected
      ).length;
    }

    // Count tools
    if (collection.toolSelections) {
      counts.tools = Object.values(collection.toolSelections).filter(
        (s: any) => s.isSelected
      ).length;
    }

    // Count equipment
    if (collection.equipmentSelections) {
      counts.equipment = Object.values(collection.equipmentSelections).filter(
        (s: any) => s.isSelected
      ).length;
    }

    counts.total = counts.products + counts.labor + counts.tools + counts.equipment;

    return counts;
  };

  // Calculate total value based on selected types
  const getCollectionValue = (collection: any) => {
    let total = 0;

    if (selectedTypes.products && collection.productSelections) {
      Object.values(collection.productSelections).forEach((s: any) => {
        if (s.isSelected) {
          total += (s.quantity || 1) * (s.unitPrice || 0);
        }
      });
    }

    if (selectedTypes.labor && collection.laborSelections) {
      Object.values(collection.laborSelections).forEach((s: any) => {
        if (s.isSelected) {
          total += (s.quantity || 1) * (s.unitPrice || 0);
        }
      });
    }

    if (selectedTypes.tools && collection.toolSelections) {
      Object.values(collection.toolSelections).forEach((s: any) => {
        if (s.isSelected) {
          total += (s.quantity || 1) * (s.unitPrice || 0);
        }
      });
    }

    if (selectedTypes.equipment && collection.equipmentSelections) {
      Object.values(collection.equipmentSelections).forEach((s: any) => {
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

  const handleToggleType = (type: keyof typeof selectedTypes) => {
    setSelectedTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleImport = (collection: any) => {
    const lineItems = convertCollectionToLineItems(collection, selectedTypes);
    onImport(lineItems);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-semibold">Import Collection</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Type Filters */}
        <div className="p-6 border-b bg-gray-50">
          <p className="text-sm text-gray-600 mb-3">Select types to import:</p>
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'products' as const, label: 'Products', icon: Package, activeClass: 'bg-orange-600', inactiveClass: 'border-orange-300 text-orange-700 hover:bg-orange-50' },
              { key: 'labor' as const, label: 'Labor', icon: Briefcase, activeClass: 'bg-purple-600', inactiveClass: 'border-purple-300 text-purple-700 hover:bg-purple-50' },
              { key: 'tools' as const, label: 'Tools', icon: Wrench, activeClass: 'bg-blue-600', inactiveClass: 'border-blue-300 text-blue-700 hover:bg-blue-50' },
              { key: 'equipment' as const, label: 'Equipment', icon: Truck, activeClass: 'bg-green-600', inactiveClass: 'border-green-300 text-green-700 hover:bg-green-50' }
            ].map(({ key, label, icon: Icon, activeClass, inactiveClass }) => (
              <button
                key={key}
                onClick={() => handleToggleType(key)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${selectedTypes[key]
                    ? `${activeClass} text-white`
                    : `border-2 ${inactiveClass}`
                  }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
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
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Collections List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              Loading collections...
            </div>
          ) : filteredCollections.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No collections found matching your search' : 'No collections available'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCollections.map(collection => {
                const counts = getCollectionCounts(collection);
                const isExpanded = expandedId === collection.id;
                const estimatedValue = getCollectionValue(collection);

                return (
                  <div
                    key={collection.id}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Collection Header */}
                    <button
                      onClick={() => handleToggleExpand(collection.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        <div className="text-left">
                          <div className="font-medium">{collection.name}</div>
                          {collection.description && (
                            <div className="text-sm text-gray-500">{collection.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{counts.total} items</div>
                      </div>
                    </button>

                    {/* Expanded Preview */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4 space-y-4">
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
                              <Wrench className="h-5 w-5 text-blue-600 mx-auto mb-1" />
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
                        <button
                          onClick={() => handleImport(collection)}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                          Import Collection
                        </button>
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