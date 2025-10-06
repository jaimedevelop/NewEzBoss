import React, { useState, useEffect } from 'react';
import { FormField } from '../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../mainComponents/forms/InputField';
import { Image, AlertCircle } from 'lucide-react';
import { useProductCreation } from '../../../../contexts/ProductCreationContext';

interface ImageTabProps {
  disabled?: boolean;
}

const ImageTab: React.FC<ImageTabProps> = ({ disabled = false }) => {
  const { state, updateField } = useProductCreation();
  const { formData } = state;
  
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset error state when URL changes
  useEffect(() => {
    setImageError(false);
    if (formData.imageUrl) {
      setImageLoading(true);
    }
  }, [formData.imageUrl]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const showPlaceholder = !formData.imageUrl || imageError;

  return (
    <div className="space-y-6">
      <FormField 
        label="Product Image URL" 
        error={formData.errors.imageUrl}
      >
        <InputField
          value={formData.imageUrl || ''}
          onChange={(e) => !disabled && updateField('imageUrl', e.target.value)}
          placeholder="https://example.com/image.jpg"
          disabled={disabled}
          error={!!formData.errors.imageUrl}
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter a direct link to an image hosted online (e.g., from Imgur, product manufacturer sites, etc.)
        </p>
      </FormField>

      {/* Image Preview Section */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Image Preview</h3>
        
        <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center" style={{ minHeight: '300px' }}>
          {showPlaceholder ? (
            // Placeholder when no image or error
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="bg-gray-200 rounded-lg p-8 mb-3">
                <Image className="w-16 h-16" />
              </div>
              <p className="text-sm text-gray-500">
                {imageError ? 'Failed to load image' : 'No image URL provided'}
              </p>
              {imageError && formData.imageUrl && (
                <div className="flex items-center text-red-600 text-xs mt-2">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span>Invalid or inaccessible URL</span>
                </div>
              )}
            </div>
          ) : (
            // Actual image preview
            <div className="relative w-full max-w-md">
              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
                </div>
              )}
              <img
                src={formData.imageUrl}
                alt="Product preview"
                className="w-full h-auto rounded-lg shadow-sm"
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: imageLoading ? 'none' : 'block' }}
              />
            </div>
          )}
        </div>

        {formData.imageUrl && !imageError && !imageLoading && (
          <p className="text-xs text-green-600 mt-2 flex items-center">
            <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
            Image loaded successfully
          </p>
        )}
      </div>
    </div>
  );
};

export default ImageTab;