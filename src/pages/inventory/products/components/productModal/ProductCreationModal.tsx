import React from 'react';
import { X, PenLine, Store } from 'lucide-react';

interface ProductCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectManual: () => void;
    onSelectFromStore: () => void;
}

const ProductCreationModal: React.FC<ProductCreationModalProps> = ({
    isOpen,
    onClose,
    onSelectManual,
    onSelectFromStore,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">Add Product</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Options */}
                <div className="p-6 flex flex-col gap-4">
                    <p className="text-sm text-gray-500 mb-2">How would you like to add a product?</p>

                    <button
                        onClick={onSelectManual}
                        className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors text-left group"
                    >
                        <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                            <PenLine className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Add Manually</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Fill out the product details yourself using the standard form.
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={onSelectFromStore}
                        className="flex items-start gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left group"
                    >
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                            <Store className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Add From Store</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Search Home Depot, Lowe's, and other stores to pull product info, SKUs, and pricing automatically.
                            </p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCreationModal;