import React, { useState, useEffect, useRef } from 'react';
import { User, Camera, AlertCircle, Loader2, Upload } from 'lucide-react';
import { useAuthContext } from '../../../contexts/AuthContext';
import { uploadProfilePicture } from '../../../services/profile/profile.files';
import { useAutoSave } from '../../../hooks/useAutoSave';
import AutoSaveIndicator from './AutoSaveIndicator';

const UserProfileSection: React.FC = () => {
  const { userProfile, updateProfile, currentUser, refreshUserProfile } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    department: ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize form data from user profile
  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        title: userProfile.title || '',
        department: userProfile.department || 'Operations'
      });
      setHasLoaded(true);
    }
  }, [userProfile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handlePhotoClick = () => {
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

    setIsUploadingPhoto(true);
    try {
      await uploadProfilePicture(file);
      await refreshUserProfile();
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getFormErrors = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';

    return newErrors;
  };

  const isFormValid = Object.keys(getFormErrors()).length === 0;

  useEffect(() => {
    if (hasLoaded) {
      setErrors(getFormErrors());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, hasLoaded]);

  const { status: autoSaveStatus, flush: flushAutoSave } = useAutoSave({
    data: formData,
    enabled: hasLoaded && isFormValid,
    onSave: async (data) => {
      return updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        title: data.title,
        department: data.department,
      });
    }
  });

  return (
    <div className="space-y-8">
      {/* Profile Picture Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
          <User className="h-5 w-5 mr-2 text-orange-600" />
          Profile Picture
        </h3>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center overflow-hidden ${userProfile?.profilePictureUrl && !isUploadingPhoto ? 'bg-white' : 'bg-orange-600'}`}>
              {isUploadingPhoto ? (
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              ) : userProfile?.profilePictureUrl ? (
                <img
                  src={userProfile.profilePictureUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-2xl font-bold">
                  {formData.firstName[0]}{formData.lastName[0]}
                </span>
              )}
            </div>
            <button
              onClick={handlePhotoClick}
              disabled={isUploadingPhoto}
              className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isUploadingPhoto ? (
                <Loader2 className="h-4 w-4 text-orange-600 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-1">Change Profile Photo</h4>
            <p className="text-sm text-gray-600 mb-3">
              Upload a new profile picture. JPG, PNG or GIF. Max size 2MB.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/png,image/jpeg,image/gif"
            />
            <button
              onClick={handlePhotoClick}
              disabled={isUploadingPhoto}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isUploadingPhoto ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Personal Information
          <AutoSaveIndicator status={autoSaveStatus} />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              onBlur={flushAutoSave}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${errors.firstName ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Enter first name"
            />
            {errors.firstName && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.firstName}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Last Name *
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              onBlur={flushAutoSave}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${errors.lastName ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Enter last name"
            />
            {errors.lastName && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.lastName}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              disabled
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">Email is managed by your account and can't be changed here.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              onBlur={flushAutoSave}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${errors.phone ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="+1 (555) 123-4567"
            />
            {errors.phone && (
              <div className="flex items-center mt-1 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.phone}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              onBlur={flushAutoSave}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
              placeholder="Enter job title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={formData.department}
              onChange={(e) => handleInputChange('department', e.target.value)}
              onBlur={flushAutoSave}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
            >
              <option value="Operations">Operations</option>
              <option value="Project Management">Project Management</option>
              <option value="Sales">Sales</option>
              <option value="Administration">Administration</option>
              <option value="Finance">Finance</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileSection;