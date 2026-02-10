import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface ComboboxOption {
    value: string;
    label: string;
}

interface ComboboxProps {
    value: string;
    onChange: (value: string) => void;
    options: ComboboxOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    color?: 'blue' | 'orange' | 'purple' | 'regular';
}

export const Combobox: React.FC<ComboboxProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select option...',
    className = '',
    disabled = false,
    color = 'regular'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const colorClasses = {
        regular: {
            input: `${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'} border-gray-200 focus:ring-gray-100 placeholder-gray-400`,
            icon: 'text-gray-400 group-hover:text-gray-600',
            item: 'bg-gray-50 text-gray-900',
            check: 'text-gray-600',
            border: 'border-gray-200'
        },
        blue: {
            input: 'text-blue-600 bg-blue-50 focus:ring-blue-200 placeholder-blue-300',
            icon: 'text-blue-400 group-hover:text-blue-600',
            item: 'bg-blue-50 text-blue-700',
            check: 'text-blue-600',
            border: 'border-blue-100'
        },
        orange: {
            input: 'text-orange-600 bg-orange-50 focus:ring-orange-200 placeholder-orange-300',
            icon: 'text-orange-400 group-hover:text-orange-600',
            item: 'bg-orange-50 text-orange-700',
            check: 'text-orange-600',
            border: 'border-orange-100'
        },
        purple: {
            input: 'text-purple-600 bg-purple-50 focus:ring-purple-200 placeholder-purple-300',
            icon: 'text-purple-400 group-hover:text-purple-600',
            item: 'bg-purple-50 text-purple-700',
            check: 'text-purple-600',
            border: 'border-purple-100'
        }
    };

    const activeColor = colorClasses[color];

    // Initialize input value based on current selected value
    useEffect(() => {
        const selectedOption = options.find(opt => opt.value === value);
        if (selectedOption) {
            setInputValue(selectedOption.label);
        } else if (value) {
            setInputValue(value); // Fallback if value handles custom strings
        } else {
            setInputValue('');
        }
    }, [value, options]);

    // Handle clicking outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset input value to currently selected option on blur without selection
                const selectedOption = options.find(opt => opt.value === value);
                if (selectedOption) {
                    setInputValue(selectedOption.label);
                } else if (!value) {
                    setInputValue('');
                } else {
                    setInputValue(value);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, options]);

    // Filter options based on input
    const filteredOptions = options.filter(option =>
        (option?.label || '').toLowerCase().includes(inputValue.toLowerCase())
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setIsOpen(true);
        setHighlightedIndex(0);

        // If user clears input, allow it ? Or treat as filtering?
        // Usually we just filter. Selection happens on click/enter.
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setIsOpen(true);
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setIsOpen(true);
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (isOpen && filteredOptions.length > 0) {
                    selectOption(filteredOptions[highlightedIndex]);
                } else if (inputValue && filteredOptions.length === 0) {
                    // If no match, maybe we want to allow custom values or just do nothing?
                    // For this specific request, it seems they want to select from list.
                }
                break;
            case 'Escape':
                setIsOpen(false);
                inputRef.current?.blur();
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    const selectOption = (option: ComboboxOption) => {
        onChange(option.value);
        setInputValue(option.label);
        setIsOpen(false);
    };

    const toggleOpen = () => {
        if (disabled) return;
        if (!isOpen) {
            setIsOpen(true);
            // If opening, maybe focus input?
            inputRef.current?.focus();
        } else {
            setIsOpen(false);
        }
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative group">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 focus:ring-2 focus:outline-none ${activeColor.input} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}`}
                />
                <div
                    className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
                    onClick={toggleOpen}
                >
                    <ChevronDown className={`w-4 h-4 ${activeColor.icon} transition-colors`} />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className={`absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border ${activeColor.border} max-h-60 overflow-y-auto overflow-x-hidden transition-all duration-200 ease-in-out`}>
                    {filteredOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-400 italic">
                            No options found
                        </div>
                    ) : (
                        filteredOptions.map((option, index) => (
                            <div
                                key={`${option.value}-${index}`}
                                className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors
                                    ${index === highlightedIndex ? activeColor.item : 'text-gray-700 hover:bg-gray-50'}
                                    ${option.value === value ? `${activeColor.item} font-semibold` : ''}
                                `}
                                onClick={() => selectOption(option)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <span className="truncate">{option.label}</span>
                                {option.value === value && (
                                    <Check className={`w-4 h-4 ${activeColor.check}`} />
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

