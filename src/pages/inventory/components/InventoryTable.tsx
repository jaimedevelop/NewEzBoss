import React from 'react';
import { Package, AlertTriangle, CheckCircle, Edit, Trash2, Eye } from 'lucide-react';

export interface InventoryProduct {
  id?: string;
  name: string;
  sku: string;
  category: string;
  subcategory: string;
  subsubcategory?: string;
  type: 'Material' | 'Tool' | 'Equipment' | 'Rental' | 'Consumable' | 'Safety';
  description: string;
  unitPrice: number;
  unit: string;
  onHand: number;
  assigned: number;
  available: number;
  minStock: number;
  maxStock: number;
  supplier: string;
  location: string;
  lastUpdated: string;
}

interface InventoryTableProps {
  products: InventoryProduct[];
  onEditProduct: (product: InventoryProduct) => void;
  onDeleteProduct: (productId: string) => void;
  onViewProduct: (product: InventoryProduct) => void;
  loading?: boolean;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
  products,
  onEditProduct,
  onDeleteProduct,
  onViewProduct,
  loading = false
}) => {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'Material':
        return 'bg-blue-100 text-blue-800';
      case 'Tool':
        return 'bg-orange-100 text-orange-800';
      case 'Equipment':
        return 'bg-purple-100 text-purple-800';
      case 'Rental':
        return 'bg-yellow-100 text-yellow-800';
      case 'Consumable':
        return 'bg-green-100 text-green-800';
      case 'Safety':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatus = (onHand: number, minStock: number) => {
    if (onHand === 0) {
      return { status: 'Out of Stock', color: 'text-red-600', icon: AlertTriangle };
    } else if (onHand <= minStock) {
      return { status: 'Low Stock', color: 'text-yellow-600', icon: AlertTriangle };
    } else {
      return { status: 'In Stock', color: 'text-green-600', icon: CheckCircle };
    }
  };

  const getCategoryHierarchy = (product: InventoryProduct) => {
    const parts = [product.category];
    if (product.subcategory) parts.push(product.subcategory);
    if (product.subsubcategory) parts.push(product.subsubcategory);
    return parts.join(' > ');
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
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">Product Catalog</h2>
        <p className="text-sm text-gray-600 mt-1">{products.length} products in inventory</p>
      </div>
      
      {products.length === 0 ? (
        <div className="p-8 text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Add your first product to get started with inventory management.</p>
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
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
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
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                        <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">
                          {product.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {getCategoryHierarchy(product)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeConfig(product.type)}`}>
                        {product.type}
                      </span>
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
                        ${product.unitPrice.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">per {product.unit}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{product.location}</div>
                      <div className="text-xs text-gray-500">{product.supplier}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onViewProduct(product)}
                          className="text-gray-400 hover:text-orange-600 transition-colors"
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
    </div>
  );
};

export default InventoryTable;