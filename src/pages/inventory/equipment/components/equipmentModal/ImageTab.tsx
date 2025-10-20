// src/pages/inventory/equipment/components/equipmentModal/ImageTab.tsx
import React, { useState } from 'react';
import { Image, Link, X } from 'lucide-react';
import { FormField } from '../../../../../mainComponents/forms/FormField';
import { InputField } from '../../../../../mainComponents/forms/InputField';
import { useEquipmentCreation } from '../../../../../contexts/EquipmentCreationContext';

interface ImageTabProps {
  disabled?: boolean;
}

const ImageTab: React.FC<ImageTabProps> = ({ disabled = false }) => {
  const { state, updateField } = useEquipmentCreation();
  const { formData } = state;
  const [imageError, setImageError] = useState(false);

  const handleClearImage = () => {
    if (!disabled) {
      updateField('imageUrl', '');
      setImageError(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageError(false);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const showPreview = formData.imageUrl && isValidUrl(formData.imageUrl) && !imageError;

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <FormField label="Image URL" error={formData.errors.imageUrl}>
        <div className="relative">
          <InputField
            type="url"
            value={formData.imageUrl}
            onChange={(e) => {
              if (!disabled) {
                updateField('imageUrl', e.target.value);
                setImageError(false);
              }
            }}
            placeholder="https://example.com/equipment-image.jpg"
            error={!!formData.errors.imageUrl}
            disabled={disabled}
          />
          {formData.imageUrl && !disabled && (
            <button
              type="button"
              onClick={handleClearImage}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors"
              title="Clear image URL"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </FormField>

      {/* Helper text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Link className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How to add an image:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Find an image of your equipment online (manufacturer website, rental store, etc.)</li>
              <li>Right-click the image and select "Copy image address" or "Copy image link"</li>
              <li>Paste the URL into the field above</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Image Preview */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
        <div className="text-center">
          <div className="mx-auto w-full max-w-md">
            {showPreview ? (
              <div>
                <img
                  src={formData.imageUrl}
                  alt="Equipment preview"
                  onError={handleImageError}
                  onLoad={handleImageLoad}
                  className="w-full h-auto rounded-lg shadow-md"
                />
                <p className="text-sm text-green-600 mt-3 font-medium">✓ Image loaded successfully</p>
              </div>
            ) : imageError ? (
              <div>
                <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <X className="h-12 w-12 text-red-600" />
                </div>
                <p className="text-red-600 font-medium mb-2">Failed to load image</p>
                <p className="text-sm text-gray-600">
                  The URL may be invalid or the image may not be accessible. Please check the URL and try again.
                </p>
              </div>
            ) : formData.imageUrl ? (
              <div>
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Image className="h-12 w-12 text-gray-400" />
                </div>
                <p className="text-gray-600">Loading image...</p>
              </div>
            ) : (
              <div>
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Image className="h-12 w-12 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2">No image URL provided</p>
                <p className="text-sm text-gray-500">
                  Enter an image URL above to see a preview
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Example URLs */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Example image sources:</p>
        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
          <li>Manufacturer websites (Caterpillar, John Deere, etc.)</li>
          <li>Rental store websites (United Rentals, Sunbelt, etc.)</li>
          <li>Equipment dealer listings</li>
          <li>Online marketplaces</li>
        </ul>
      </div>
    </div>
  );
};

export default ImageTab;