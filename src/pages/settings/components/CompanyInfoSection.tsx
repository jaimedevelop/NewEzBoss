import React, { useState, useEffect, useRef } from 'react';
import { Building, Upload, AlertCircle, MapPin, Phone, Globe, Loader2 } from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { uploadCompanyLogo } from '../../../services/profile/profile.files';
import { useAutoSave } from '../../../hooks/useAutoSave';
import AutoSaveIndicator from './AutoSaveIndicator';

const CompanyInfoSection: React.FC = () => {
  const { userProfile, updateProfile, currentUser, refreshUserProfile } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    licenseNumber: '',
    taxId: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    website: '',
    defaultTaxRate: '',
    currency: 'USD',
    timezone: 'America/Los_Angeles'
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sectionFields: { [key: string]: string[] } = {
    basic: ['companyName', 'licenseNumber', 'taxId'],
    address: ['address', 'city', 'state', 'zipCode'],
    contact: ['phone', 'website'],
    settings: ['defaultTaxRate', 'currency', 'timezone']
  };

  const getSectionForField = (field: string) =>
    Object.keys(sectionFields).find((section) => sectionFields[section].includes(field)) || null;

  // Initialize form data from user profile
  useEffect(() => {
    if (userProfile) {
      setFormData({
        companyName: userProfile.company || '',
        licenseNumber: userProfile.licenseNumber || '',
        taxId: userProfile.taxId || '',
        address: userProfile.address || '',
        city: userProfile.city || '',
        state: userProfile.state || '',
        zipCode: userProfile.zipCode || '',
        phone: userProfile.phone || '',
        website: userProfile.website || '',
        defaultTaxRate: userProfile.defaultTaxRate?.toString() || '',
        currency: userProfile.currency || 'USD',
        timezone: userProfile.timezone || 'America/Los_Angeles'
      });
      setHasLoaded(true);
    }
  }, [userProfile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setActiveSection(getSectionForField(field));
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit');
      return;
    }

    setIsUploadingLogo(true);
    try {
      await uploadCompanyLogo(file);
      await refreshUserProfile();
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const getFormErrors = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';
    if (!formData.zipCode.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (formData.defaultTaxRate && (isNaN(Number(formData.defaultTaxRate)) || Number(formData.defaultTaxRate) < 0)) {
      newErrors.defaultTaxRate = 'Please enter a valid tax rate';
    }

    return newErrors;
  };

  const { status: autoSaveStatus, flush: flushAutoSave } = useAutoSave({
    data: formData,
    enabled: hasLoaded && Object.keys(getFormErrors()).length === 0,
    onSave: async (data) => {
      return updateProfile({
        company: data.companyName,
        licenseNumber: data.licenseNumber,
        taxId: data.taxId,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        phone: data.phone,
        website: data.website,
        defaultTaxRate: data.defaultTaxRate ? Number(data.defaultTaxRate) : undefined,
        currency: data.currency,
        timezone: data.timezone
      });
    }
  });

  return (
    <div className="space-y-8">
      {/* Company Logo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <Building className="h-5 w-5 mr-2 text-orange-600" />
          Company Logo
        </h3>
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 relative overflow-hidden">
            {isUploadingLogo ? (
              <Loader2 className="h-8 w-8 text-orange-600 animate-spin" />
            ) : userProfile?.companyLogo ? (
              <img
                src={userProfile.companyLogo}
                alt="Company Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <Building className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-1">Upload Company Logo</h4>
            <p className="text-sm text-gray-600 mb-3">
              Upload your company logo for estimates and invoices. PNG, JPG or SVG. Max size 2MB.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png,image/jpeg,image/svg+xml"
            />
            <button
              onClick={handleLogoClick}
              disabled={isUploadingLogo}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isUploadingLogo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Basic Company Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Basic Information
          <AutoSaveIndicator status={activeSection === 'basic' ? autoSaveStatus : 'idle'} />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              onBlur={flushAutoSave}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${errors.companyName ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Enter company name"
            />
            {errors.companyName && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.companyName}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              License Number
            </label>
            <input
              type="text"
              value={formData.licenseNumber}
              onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
              onBlur={flushAutoSave}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              placeholder="Enter license number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax ID / EIN
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => handleInputChange('taxId', e.target.value)}
              onBlur={flushAutoSave}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              placeholder="12-3456789"
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <MapPin className="h-5 w-5 mr-2 text-orange-600" />
          Business Address
          <AutoSaveIndicator status={activeSection === 'address' ? autoSaveStatus : 'idle'} />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Street Address *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              onBlur={flushAutoSave}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Enter street address"
            />
            {errors.address && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.address}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              onBlur={flushAutoSave}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${errors.city ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Enter city"
            />
            {errors.city && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.city}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State *
            </label>
            <select
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              onBlur={flushAutoSave}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${errors.state ? 'border-red-300' : 'border-gray-300'
                }`}
            >
              <option value="">Select state</option>
              <option value="CA">California</option>
              <option value="TX">Texas</option>
              <option value="FL">Florida</option>
              <option value="NY">New York</option>
              <option value="IL">Illinois</option>
              {/* Add more states as needed */}
            </select>
            {errors.state && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.state}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Code *
            </label>
            <input
              type="text"
              value={formData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              onBlur={flushAutoSave}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${errors.zipCode ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="90210"
            />
            {errors.zipCode && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.zipCode}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Contact Information
          <AutoSaveIndicator status={activeSection === 'contact' ? autoSaveStatus : 'idle'} />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Phone className="h-4 w-4 mr-1" />
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              onBlur={flushAutoSave}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="+1 (555) 987-6543"
            />
            {errors.phone && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.phone}
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Globe className="h-4 w-4 mr-1" />
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              onBlur={flushAutoSave}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              placeholder="https://company.com"
            />
          </div>
        </div>
      </div>

      {/* Business Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Business Settings
          <AutoSaveIndicator status={activeSection === 'settings' ? autoSaveStatus : 'idle'} />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Tax Rate (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.defaultTaxRate}
              onChange={(e) => handleInputChange('defaultTaxRate', e.target.value)}
              onBlur={flushAutoSave}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${errors.defaultTaxRate ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="8.5"
              min="0"
              max="100"
            />
            {errors.defaultTaxRate && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.defaultTaxRate}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              onBlur={flushAutoSave}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            >
              <option value="USD">USD - US Dollar</option>
              <option value="CAD">CAD - Canadian Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Zone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              onBlur={flushAutoSave}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            >
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/New_York">Eastern Time</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyInfoSection;