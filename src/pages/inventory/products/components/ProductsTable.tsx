import React from 'react';
import { Package, AlertTriangle, CheckCircle, Edit, Trash2, Eye, Copy } from 'lucide-react';
import PageSizeSelector from '../../../../mainComponents/ui/PageSizeSelector';
import PaginationControls from '../../../../mainComponents/ui/PaginationControls';

// SKU entry interface for multiple supplier SKUs
export interface SKUEntry {
  id: string;
  store: string;
  sku: string;
}

// Price entry interface for multiple store prices
export interface PriceEntry {
  id: string;
  store: string;
  price: number;
}

export interface ProductsProduct {
  id?: string;
  name: string;
  sku: string;
  trade: string; // NEW - Top level of hierarchy
  section: string;
  category: string;
  subcategory: string;
  type: string; // Changed from enum to string - now part of hierarchy
  size?: string;
  description: string;
  unitPrice: number; // This will be deprecated in favor of price entries
  unit: string;
  onHand: number;
  assigned: number;
  available: number;
  minStock: number;
  maxStock: number;
  supplier: string;
  location: string;
  lastUpdated: string;
  skus?: SKUEntry[];
  priceEntries?: PriceEntry[]; // NEW - Multiple store prices
  barcode?: string;
  brand?: string; // Add if missing
}

interface ProductsTableProps {
  products: ProductsProduct[];
  onEditProduct: (product: ProductsProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onViewProduct: (product: ProductsProduct) => void;
  onDuplicateProduct?: (product: ProductsProduct) => void;
  loading?: boolean;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  currentPage: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
}

const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  onEditProduct,
  onDeleteProduct,
  onViewProduct,
  onDuplicateProduct,
  loading = false,
  pageSize,
  onPageSizeChange,
  currentPage,
  hasMore,
  onPageChange
}) => {
  const getStockStatus = (onHand: number, minStock: number) => {
    if (onHand === 0) {
      return { status: 'Out of Stock', color: 'text-red-600', icon: AlertTriangle };
    } else if (onHand <= minStock) {
      return { status: 'Low Stock', color: 'text-yellow-600', icon: AlertTriangle };
    } else {
      return { status: 'In Stock', color: 'text-green-600', icon: CheckCircle };
    }
  };

  const getProductFamily = (product: ProductsProduct) => {
    const parts = [];
    if (product.trade) parts.push(product.trade);
    if (product.section) parts.push(product.section);
    if (product.category) parts.push(product.category);
    if (product.subcategory) parts.push(product.subcategory);
    if (product.type) parts.push(product.type);
    return parts;
  };

  const getMostExpensivePrice = (product: ProductsProduct): number => {
    // If there are price entries, find the most expensive one
    if (product.priceEntries && product.priceEntries.length > 0) {
      const prices = product.priceEntries.map(entry => entry.price).filter(price => price > 0);
      if (prices.length > 0) {
        return Math.max(...prices);
      }
    }
    // Fall back to unitPrice if no price entries
    return product.unitPrice || 0;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Product Catalog</h2>
          <p className="text-sm text-gray-600 mt-1">Loading products...</p>
        </div>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header with Page Size Selector */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Product Catalog</h2>
          <p className="text-sm text-gray-600 mt-1">{products.length} products displayed</p>
        </div>
        <PageSizeSelector 
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          color="orange"
        />
      </div>
      
      {products.length === 0 ? (
        <div className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your filters or add your first product.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Image
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hierarchy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inventory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => {
                const stockStatus = getStockStatus(product.onHand, product.minStock);
                const StatusIcon = stockStatus.icon;
                const familyParts = getProductFamily(product);
                const mostExpensivePrice = getMostExpensivePrice(product);
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 whitespace-nowrap">{product.name}</div>
                        <div className="text-xs text-gray-400 mt-1 max-w-xs break-words">
                          {product.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-contain" // Changed from object-cover to object-contain
                          onError={(e) => {
                            // Fallback to placeholder on error
                            e.currentTarget.src = '';
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `
                              <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            `;
                          }}
                        />
                      ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                  </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 space-y-1">
                        {familyParts.map((part, index) => (
                          <div 
                            key={index} 
                            className={`text-xs px-2 py-1 rounded ${
                              index === 0 ? 'bg-blue-100 text-blue-800' :
                              index === 1 ? 'bg-green-100 text-green-800' :
                              index === 2 ? 'bg-purple-100 text-purple-800' :
                              index === 3 ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {part}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center text-sm font-medium ${stockStatus.color}`}>
                        <StatusIcon className="h-4 w-4 mr-1" />
                        {stockStatus.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500">On Hand:</span>
                          <span className="font-medium">{product.onHand} {product.unit}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-500">Assigned:</span>
                          <span className="text-orange-600">{product.assigned} {product.unit}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Available:</span>
                          <span className="font-medium text-green-600">{product.available} {product.unit}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${mostExpensivePrice.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">per {product.unit}</div>
                      {product.priceEntries && product.priceEntries.length > 1 && (
                        <div className="text-xs text-blue-600">
                          {product.priceEntries.length} prices
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.location}</div>
                      {product.supplier && (
                        <div className="text-xs text-gray-500">{product.supplier}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onViewProduct(product)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Product"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onEditProduct(product)}
                          className="text-gray-400 hover:text-orange-600 transition-colors"
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {onDuplicateProduct && (
                          <button
                            onClick={() => onDuplicateProduct(product)}
                            className="text-gray-400 hover:text-green-600 transition-colors"
                            title="Duplicate Product"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => product.id && onDeleteProduct(product.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}          
      <PaginationControls
            currentPage={currentPage}
            hasMore={hasMore}
            onPageChange={onPageChange}
            totalDisplayed={products.length}
            pageSize={pageSize}
            color="orange"
          />
    </div>
  );
};

export default ProductsTable;