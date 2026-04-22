import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

interface DropdownOption {
    value: string;
    label: string;
}

interface DropdownProps {
    value: string;
    onChange: (value: string) => void;
    options: DropdownOption[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    color?: 'blue' | 'orange' | 'purple' | 'green' | 'regular';
}

export const Dropdown: React.FC<DropdownProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select option...',
    className = '',
    disabled = false,
    color = 'regular'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [typeaheadString, setTypeaheadString] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const colorClasses = {
        regular: {
            button: `${disabled ? 'bg-gray-50 text-gray-500' : 'bg-white text-gray-900'} border-gray-300 focus:ring-gray-200 hover:border-gray-400`,
            icon: 'text-gray-400',
            highlighted: 'bg-gray-600 text-white',
            selected: 'bg-gray-100 text-gray-900 font-semibold',
            unselected: 'bg-white text-gray-700 hover:bg-gray-50',
            check: 'text-gray-600',
            border: 'border-gray-200',
            clear: 'text-gray-400 hover:text-gray-600'
        },
        blue: {
            button: disabled
                ? 'bg-gray-50 text-gray-500 border-gray-300'
                : 'bg-white text-gray-900 border-blue-300 focus:ring-blue-200 hover:border-blue-400',
            icon: disabled ? 'text-gray-400' : 'text-blue-400',
            highlighted: 'bg-blue-600 text-white',
            selected: 'bg-blue-100 text-blue-800 font-semibold',
            unselected: 'bg-white text-blue-700 hover:bg-blue-50',
            check: 'text-blue-600',
            border: 'border-blue-100',
            clear: 'text-blue-400 hover:text-blue-600'
        },
        orange: {
            button: disabled
                ? 'bg-gray-50 text-gray-500 border-gray-300'
                : 'bg-white text-gray-900 border-orange-300 focus:ring-orange-200 hover:border-orange-400',
            icon: disabled ? 'text-gray-400' : 'text-orange-400',
            highlighted: 'bg-orange-600 text-white',
            selected: 'bg-orange-100 text-orange-800 font-semibold',
            unselected: 'bg-white text-orange-700 hover:bg-orange-50',
            check: 'text-orange-600',
            border: 'border-orange-100',
            clear: 'text-orange-400 hover:text-orange-600'
        },
        purple: {
            button: disabled
                ? 'bg-gray-50 text-gray-500 border-gray-300'
                : 'bg-white text-gray-900 border-purple-300 focus:ring-purple-200 hover:border-purple-400',
            icon: disabled ? 'text-gray-400' : 'text-purple-400',
            highlighted: 'bg-purple-600 text-white',
            selected: 'bg-purple-100 text-purple-800 font-semibold',
            unselected: 'bg-white text-purple-700 hover:bg-purple-50',
            check: 'text-purple-600',
            border: 'border-purple-100',
            clear: 'text-purple-400 hover:text-purple-600'
        },
        green: {
            button: disabled
                ? 'bg-gray-50 text-gray-500 border-gray-300'
                : 'bg-white text-gray-900 border-green-300 focus:ring-green-200 hover:border-green-400',
            icon: disabled ? 'text-gray-400' : 'text-green-400',
            highlighted: 'bg-green-600 text-white',
            selected: 'bg-green-100 text-green-800 font-semibold',
            unselected: 'bg-white text-green-700 hover:bg-green-50',
            check: 'text-green-600',
            border: 'border-green-100',
            clear: 'text-green-400 hover:text-green-600'
        }
    };

    const activeColor = colorClasses[color];

    const isClearable = value !== '' && value !== undefined;

    const getDisplayLabel = () => {
        const selectedOption = options.find(opt => opt.value === value);
        return selectedOption?.label || placeholder;
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setTypeaheadString('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            const currentIndex = options.findIndex(opt => opt.value === value);
            setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
    }, [isOpen, value, options]);

    useEffect(() => {
        if (isOpen && listRef.current) {
            const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [highlightedIndex, isOpen]);

    useEffect(() => {
        if (!isOpen || disabled) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setHighlightedIndex(prev => prev < options.length - 1 ? prev + 1 : prev);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                    break;
                case 'Home':
                    e.preventDefault();
                    setHighlightedIndex(0);
                    break;
                case 'End':
                    e.preventDefault();
                    setHighlightedIndex(options.length - 1);
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (options.length > 0) selectOption(options[highlightedIndex]);
                    break;
                case 'Escape':
                    e.preventDefault();
                    setIsOpen(false);
                    setTypeaheadString('');
                    break;
                case 'Tab':
                    setIsOpen(false);
                    setTypeaheadString('');
                    break;
                default:
                    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                        e.preventDefault();
                        handleTypeahead(e.key);
                    }
                    break;
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isOpen, disabled, highlightedIndex, options, typeaheadString]);

    useEffect(() => {
        if (typeaheadString) {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => setTypeaheadString(''), 500);
        }
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [typeaheadString]);

    const handleButtonKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (!isOpen && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            setIsOpen(true);
        }
    };

    const handleTypeahead = (char: string) => {
        const newString = typeaheadString + char.toLowerCase();
        setTypeaheadString(newString);
        const matchIndex = options.findIndex(opt => opt.label.toLowerCase().startsWith(newString));
        if (matchIndex >= 0) setHighlightedIndex(matchIndex);
    };

    const selectOption = (option: DropdownOption) => {
        onChange(option.value);
        setIsOpen(false);
        setTypeaheadString('');
    };

    const toggleOpen = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        if (isOpen) setTypeaheadString('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setIsOpen(false);
        setTypeaheadString('');
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={toggleOpen}
                onKeyDown={handleButtonKeyDown}
                disabled={disabled}
                className={`w-full px-4 py-2 text-sm font-medium rounded-lg border focus:ring-2 focus:outline-none transition-colors flex items-center justify-between ${activeColor.button} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                <span className={`truncate ${!value && disabled ? 'text-gray-400' : ''}`}>
                    {getDisplayLabel()}
                </span>
                <span className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {isClearable && !disabled && (
                        <span role="button" onClick={handleClear} className={`rounded transition-colors ${activeColor.clear}`}>
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${activeColor.icon}`} />
                </span>
            </button>

            {isOpen && !disabled && (
                <div
                    ref={listRef}
                    className={`absolute z-50 w-full mt-1 rounded-lg shadow-xl border ${activeColor.border} max-h-60 overflow-y-auto transition-all duration-200 ease-in-out`}
                >
                    {options.length === 0 ? (
                        <div className={`px-3 py-2 text-sm italic ${activeColor.unselected} text-opacity-60`}>
                            No options available
                        </div>
                    ) : (
                        options.map((option, index) => (
                            <div
                                key={`${option.value}-${index}`}
                                className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors ${index === highlightedIndex
                                    ? activeColor.highlighted
                                    : option.value === value
                                        ? activeColor.selected
                                        : activeColor.unselected
                                    }`}
                                onClick={() => selectOption(option)}
                                onMouseEnter={() => setHighlightedIndex(index)}
                            >
                                <span className="truncate">{option.label}</span>
                                {option.value === value && (
                                    <Check className={`w-4 h-4 ml-2 flex-shrink-0 ${index === highlightedIndex ? 'text-white' : activeColor.check}`} />
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};