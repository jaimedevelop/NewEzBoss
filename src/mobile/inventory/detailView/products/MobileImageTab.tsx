// src/mobile/inventory/detailView/products/MobileImageTab.tsx
import React, { useState, useEffect } from 'react';
import { Image, AlertCircle, X } from 'lucide-react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { useProductCreation } from '../../../../contexts/ProductCreationContext';

interface MobileImageTabProps {
    disabled?: boolean;
}

const MobileImageTab: React.FC<MobileImageTabProps> = ({ disabled = false }) => {
    const { state, updateField } = useProductCreation();
    const { formData } = state;

    const [imageLoading, setImageLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
        if (formData.imageUrl) {
            setImageLoading(true);
        }
    }, [formData.imageUrl]);

    const handleClearImage = () => {
        if (!disabled) {
            updateField('imageUrl', '');
            setImageError(false);
        }
    };

    const showPlaceholder = !formData.imageUrl || imageError;

    return (
        <div className="flex flex-col gap-4 px-4 pb-6">
            {/* Header */}
            <div className="pt-2">
                <h3 className="text-base font-semibold text-gray-900">Product Image</h3>
            </div>

            {/* Image preview — above the input on mobile for quick visual feedback */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                {showPlaceholder ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <div className="bg-gray-200 rounded-xl p-6 mb-3">
                            <Image className="w-12 h-12" />
                        </div>
                        <p className="text-sm text-gray-500">
                            {imageError ? 'Failed to load image' : 'No image provided'}
                        </p>
                        {imageError && formData.imageUrl && (
                            <div className="flex items-center text-red-500 text-xs mt-2">
                                <AlertCircle className="w-4 h-4 mr-1" />
                                <span>Invalid or inaccessible URL</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative w-full">
                        {imageLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
                            </div>
                        )}
                        <img
                            src={formData.imageUrl}
                            alt="Product preview"
                            className="w-full h-auto"
                            onLoad={() => { setImageLoading(false); setImageError(false); }}
                            onError={() => { setImageLoading(false); setImageError(true); }}
                            style={{ display: imageLoading ? 'none' : 'block' }}
                        />
                    </div>
                )}

                {/* Success indicator inside the card */}
                {formData.imageUrl && !imageError && !imageLoading && (
                    <div className="flex items-center gap-1.5 px-3 py-2 border-t border-gray-100 bg-white">
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <span className="text-xs text-green-600">Image loaded successfully</span>
                    </div>
                )}
            </div>

            {/* URL input */}
            <FormField label="Image URL" error={formData.errors.imageUrl}>
                <div className="relative">
                    <InputField
                        type="url"
                        value={formData.imageUrl || ''}
                        onChange={(e) => {
                            if (!disabled) {
                                updateField('imageUrl', e.target.value);
                                setImageError(false);
                            }
                        }}
                        placeholder="https://example.com/image.jpg"
                        disabled={disabled}
                        error={!!formData.errors.imageUrl}
                    />
                    {formData.imageUrl && !disabled && (
                        <button
                            type="button"
                            onClick={handleClearImage}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:text-red-600 transition-colors"
                            title="Clear image URL"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    Paste a direct link to an image hosted online
                </p>
            </FormField>
        </div>
    );
};

export default MobileImageTab;