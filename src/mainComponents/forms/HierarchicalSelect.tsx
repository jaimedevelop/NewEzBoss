// src/mainComponents/forms/HierarchicalSelect.tsx
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, X, AlertTriangle } from 'lucide-react';
import { Alert } from '../ui/Alert';

interface Option {
  value: string;
  label: string;
  id?: string;
}

interface HierarchicalSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  onAddNew: (name: string) => Promise<{ success: boolean; error?: string }>;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const HierarchicalSelect: React.FC<HierarchicalSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  onAddNew,
  disabled = false,
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAddingNew(false);
        setNewItemName('');
        setError('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus input when switching to add mode
  useEffect(() => {
    if (isAddingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingNew]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleAddNewClick = () => {
    setIsAddingNew(true);
    setError('');
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewItemName('');
    setError('');
  };

  const handleSaveNew = async () => {
    const trimmedName = newItemName.trim();
    
    if (!trimmedName) {
      setError('Name cannot be empty');
      return;
    }

    if (trimmedName.length > 30) {
      setError('Name must be 30 characters or less');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await onAddNew(trimmedName);
      
      if (result.success) {
        onChange(trimmedName);
        setIsAddingNew(false);
        setNewItemName('');
        setIsOpen(false);
      } else {
        setError(result.error || 'Failed to add new item');
      }
    } catch (err) {
      setError('Failed to add new item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveNew();
    } else if (e.key === 'Escape') {
      handleCancelAdd();
    }
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
          ${disabled ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-900'}
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${isOpen ? 'ring-2 ring-orange-500 border-orange-500' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-400'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Regular Options */}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                w-full px-3 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100
                ${option.value === value ? 'bg-orange-50 text-orange-600' : 'text-gray-900'}
              `}
            >
              <div className="flex items-center justify-between">
                <span>{option.label}</span>
                {option.value === value && (
                  <Check className="w-4 h-4 text-orange-600" />
                )}
              </div>
            </button>
          ))}

          {/* Divider */}
          {options.length > 0 && (
            <div className="border-t border-gray-200 my-1"></div>
          )}

          {/* Add New Section */}
          {!isAddingNew ? (
            <button
              type="button"
              onClick={handleAddNewClick}
              className="w-full px-3 py-2 text-left text-orange-600 hover:bg-orange-50 focus:outline-none focus:bg-orange-50 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New
            </button>
          ) : (
            <div className="p-3 border-t border-gray-200">
              <div className="space-y-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Enter new name..."
                  maxLength={30}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  disabled={isLoading}
                />
                
                {error && (
                  <div className="flex items-center text-xs text-red-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{newItemName.length}/30 characters</span>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={handleSaveNew}
                      disabled={isLoading || !newItemName.trim()}
                      className="flex items-center px-2 py-1 text-green-600 hover:bg-green-50 rounded disabled:text-gray-400 disabled:hover:bg-transparent"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelAdd}
                      disabled={isLoading}
                      className="flex items-center px-2 py-1 text-red-600 hover:bg-red-50 rounded disabled:text-gray-400 disabled:hover:bg-transparent"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HierarchicalSelect;