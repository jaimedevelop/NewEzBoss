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
            highlighted: 'bg-gray-200 text-gray-900',
            selected: 'bg-gray-50 text-gray-900 font-semibold',
            check: 'text-gray-600',
            border: 'border-gray-200',
            clear: 'text-gray-400 hover:text-gray-600'
        },
        blue: {
            button: 'text-blue-600 bg-blue-50 border-blue-200 focus:ring-blue-200 hover:border-blue-300',
            icon: 'text-blue-400',
            highlighted: 'bg-blue-200 text-blue-900',
            selected: 'bg-blue-50 text-blue-700 font-semibold',
            check: 'text-blue-600',
            border: 'border-blue-100',
            clear: 'text-blue-400 hover:text-blue-600'
        },
        orange: {
            button: 'text-orange-600 bg-orange-50 border-orange-200 focus:ring-orange-200 hover:border-orange-300',
            icon: 'text-orange-400',
            highlighted: 'bg-orange-200 text-orange-900',
            selected: 'bg-orange-50 text-orange-700 font-semibold',
            check: 'text-orange-600',
            border: 'border-orange-100',
            clear: 'text-orange-400 hover:text-orange-600'
        },
        purple: {
            button: 'text-purple-600 bg-purple-50 border-purple-200 focus:ring-purple-200 hover:border-purple-300',
            icon: 'text-purple-400',
            highlighted: 'bg-purple-200 text-purple-900',
            selected: 'bg-purple-50 text-purple-700 font-semibold',
            check: 'text-purple-600',
            border: 'border-purple-100',
            clear: 'text-purple-400 hover:text-purple-600'
        },
        green: {
            button: 'text-green-600 bg-green-50 border-green-200 focus:ring-green-200 hover:border-green-300',
            icon: 'text-green-400',
            highlighted: 'bg-green-200 text-green-900',
            selected: 'bg-green-50 text-green-700 font-semibold',
            check: 'text-green-600',
            border: 'border-green-100',
            clear: 'text-green-400 hover:text-green-600'
        }
    };

    const activeColor = colorClasses[color];

    // Determine if a non-empty, non-default option is selected
    const isClearable = value !== '' && value !== undefined;

    // Get display label for current value
    const getDisplayLabel = () => {
        const selectedOption = options.find(opt => opt.value === value);
        return selectedOption?.label || placeholder;
    };

    // Handle clicking outside to close
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

    // Reset highlighted index when value changes or dropdown opens
    useEffect(() => {
        if (isOpen) {
            const currentIndex = options.findIndex(opt => opt.value === value);
            setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
    }, [isOpen, value, options]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (isOpen && listRef.current) {
            const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [highlightedIndex, isOpen]);

    // Global keydown listener when dropdown is open
    useEffect(() => {
        if (!isOpen || disabled) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setHighlightedIndex(prev =>
                        prev < options.length - 1 ? prev + 1 : prev
                    );
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
                    if (options.length > 0) {
                        selectOption(options[highlightedIndex]);
                    }
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
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [isOpen, disabled, highlightedIndex, options, typeaheadString]);

    // Clear typeahead string after timeout
    useEffect(() => {
        if (typeaheadString) {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                setTypeaheadString('');
            }, 500);
        }
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [typeaheadString]);

    const handleButtonKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            setIsOpen(true);
            return;
        }
    };

    const handleTypeahead = (char: string) => {
        const newString = typeaheadString + char.toLowerCase();
        setTypeaheadString(newString);

        const matchIndex = options.findIndex(option =>
            option.label.toLowerCase().startsWith(newString)
        );

        if (matchIndex >= 0) {
            setHighlightedIndex(matchIndex);
        }
    };

    const selectOption = (option: DropdownOption) => {
        onChange(option.value);
        setIsOpen(false);
        setTypeaheadString('');
    };

    const toggleOpen = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
        if (isOpen) {
            setTypeaheadString('');
        }
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
                <span className={`truncate ${!value ? 'text-gray-400' : ''}`}>
                    {getDisplayLabel()}
                </span>
                <span className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {isClearable && !disabled && (
                        <span
                            role="button"
                            onClick={handleClear}
                            className={`rounded transition-colors ${activeColor.clear}`}
                        >
                            <X className="w-3.5 h-3.5" />
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''} ${activeColor.icon}`} />
                </span>
            </button>

            {isOpen && !disabled && (
                <div
                    ref={listRef}
                    className={`absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border ${activeColor.border} max-h-60 overflow-y-auto transition-all duration-200 ease-in-out`}
                >
                    {options.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-400 italic">
                            No options available
                        </div>
                    ) : (
                        options.map((option, index) => (
                            <div
                                key={`${option.value}-${index}`}
                                className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between transition-colors
    ${index === highlightedIndex
                                        ? 'bg-orange-500 text-white'
                                        : option.value === value
                                            ? activeColor.selected
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }
`}
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