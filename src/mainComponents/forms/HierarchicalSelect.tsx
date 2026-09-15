// src/mainComponents/forms/HierarchicalSelect.tsx
import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Plus, Check, X, AlertTriangle } from 'lucide-react';

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
  onAddNew?: (name: string) => Promise<{ success: boolean; error?: string }>;
  searchable?: boolean;
  ariaLabel?: string;
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
  searchable = false,
  ariaLabel,
  disabled = false,
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [query, setQuery] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedOption = options.find(opt => opt.value === value);
  // Values can be repeated names (for example, imported brand records).
  // Keep unique row keys before filtering so React removes every non-match.
  const optionRows = options.map((option, index) => ({ option, key: index }));
  const filteredOptions = searchable
    ? optionRows.filter(({ option }) => option.label.toLowerCase().includes((query || '').toLowerCase()))
    : optionRows;
  const activeIndex = highlightedIndex < filteredOptions.length ? highlightedIndex : -1;
  // Callers often recreate option arrays each render. Reset only for content changes.
  const optionsKey = JSON.stringify(options);

  const dismiss = () => {
    setIsOpen(false);
    setQuery('');
    setHighlightedIndex(-1);
    setIsAddingNew(false);
    setNewItemName('');
    setError('');
  };

  useEffect(() => {
    if (searchable) {
      setQuery('');
      setHighlightedIndex(-1);
      setIsOpen(false);
      setIsAddingNew(false);
      setNewItemName('');
      setError('');
    }
  }, [value, disabled, searchable]);

  useEffect(() => {
    // Refresh results using the current query; only a value/disabled change
    // or explicit dismissal should discard the user's search.
    setHighlightedIndex(-1);
  }, [optionsKey]);

  useEffect(() => {
    if (searchable && isOpen && activeIndex >= 0) {
      document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen, listId, searchable]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        dismiss();
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
    if (disabled) return;
    onChange(optionValue);
    dismiss();
    if (searchable) searchRef.current?.focus();
  };

  const handleAddNewClick = () => {
    setQuery('');
    setHighlightedIndex(-1);
    setIsAddingNew(true);
    setError('');
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewItemName('');
    setError('');
  };

  const handleSaveNew = async () => {
    if (disabled || isLoading || !onAddNew) return;
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
        dismiss();
        if (searchable) searchRef.current?.focus();
      } else {
        setError(result.error || 'Failed to add new item');
      }
    } catch {
      setError('Failed to add new item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (!e.nativeEvent.isComposing) void handleSaveNew();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleCancelAdd();
      if (searchable) searchRef.current?.focus();
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (event.nativeEvent.isComposing) return;
      if (isOpen && activeIndex >= 0) handleSelect(filteredOptions[activeIndex].option.value);
      else setIsOpen(true);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      const count = filteredOptions.length;
      setHighlightedIndex(count === 0 ? -1 : event.key === 'ArrowDown'
        ? (activeIndex + 1) % count
        : (activeIndex <= 0 ? count - 1 : activeIndex - 1));
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    } else if (event.key === 'Tab') {
      // Discard search without trapping focus; Add New remains reachable by Tab.
      setQuery(null);
      setHighlightedIndex(-1);
    } else if (!isOpen && event.key.length === 1) {
      searchRef.current?.select();
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}
      onBlur={searchable ? (event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) dismiss();
      } : undefined}
    >
      {/* Main Select Button */}
      {searchable ? (
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            role="combobox"
            aria-label={ariaLabel || placeholder}
            aria-expanded={isOpen && !disabled}
            aria-controls={isOpen && !disabled ? listId : undefined}
            aria-autocomplete="list"
            aria-required={required}
            aria-activedescendant={isOpen && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            autoComplete="off"
            disabled={disabled}
            value={isOpen && query !== null ? query : selectedOption?.label || ''}
            placeholder={isOpen ? placeholder : selectedOption?.label || placeholder}
            onClick={() => {
              if (!isOpen) setQuery('');
              setIsOpen(true);
            }}
            onFocus={(event) => event.currentTarget.select()}
            onPaste={() => { if (!isOpen) searchRef.current?.select(); }}
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlightedIndex(0);
              setIsOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            className={`w-full px-3 py-2 pr-9 text-left border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
              ${disabled ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-900'}
              ${error ? 'border-red-300' : 'border-gray-300'}
              ${isOpen ? 'ring-2 ring-orange-500 border-orange-500' : ''}`}
          />
          <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      ) : <button
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
      </button>}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Regular Options */}
          <div id={listId} role={searchable ? 'listbox' : undefined} aria-label={ariaLabel || placeholder}>
          {filteredOptions.map(({ option, key }, index) => (
            <button
              key={key}
              id={`${listId}-${index}`}
              role={searchable ? 'option' : undefined}
              aria-selected={searchable ? option.value === value : undefined}
              tabIndex={searchable ? -1 : undefined}
              onMouseDown={searchable ? (event) => event.preventDefault() : undefined}
              onMouseEnter={searchable ? () => setHighlightedIndex(index) : undefined}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                w-full px-3 py-2 text-left hover:bg-gray-100 focus:outline-none focus:bg-gray-100
                ${searchable && index === activeIndex ? 'bg-gray-100' : ''}
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

          </div>
          {searchable && filteredOptions.length === 0 && (
            <div role="status" className="px-3 py-2 text-sm text-gray-500">No matches found</div>
          )}

          {/* Divider */}
          {filteredOptions.length > 0 && (
            <div className="border-t border-gray-200 my-1"></div>
          )}

          {/* Add New Section */}
          {onAddNew && (!isAddingNew ? (
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
                  aria-label={`New ${ariaLabel || placeholder}`}
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
                  <div role="alert" className="flex items-center text-xs text-red-600">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {error}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{newItemName.length}/30 characters</span>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      aria-label="Save new item"
                      onClick={handleSaveNew}
                      disabled={isLoading || !newItemName.trim()}
                      className="flex items-center px-2 py-1 text-green-600 hover:bg-green-50 rounded disabled:text-gray-400 disabled:hover:bg-transparent"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel adding item"
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
          ))}
        </div>
      )}
    </div>
  );
};

export default HierarchicalSelect;