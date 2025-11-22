// src/mainComponents/forms/MarkdownTextarea.tsx
import React, { useState } from 'react';
import { Eye, Edit, Info } from 'lucide-react';

/**
 * MarkdownTextarea - A textarea component with markdown preview
 * 
 * Perfect for AI-generated content that includes formatting like:
 * - Numbered lists (1. , 2. , etc.)
 * - Bullet lists (* or -)
 * - Nested bullets (  * sub-item)
 * - Bold text (**bold**)
 * 
 * Usage:
 * ```tsx
 * <MarkdownTextarea
 *   value={description}
 *   onChange={(value) => setDescription(value)}
 *   placeholder="Paste your AI-generated task steps here..."
 *   rows={10}
 * />
 * ```
 */

interface MarkdownTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  label?: string;
}

export const MarkdownTextarea: React.FC<MarkdownTextareaProps> = ({
  value,
  onChange,
  placeholder = 'Enter text here...',
  disabled = false,
  rows = 8,
  label
}) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  // Simple markdown parser for common elements
  const parseMarkdown = (text: string): JSX.Element => {
    if (!text || !text.trim()) {
      return <p className="text-gray-400 italic">No content yet - paste your formatted text here</p>;
    }

    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: { type: 'ul' | 'ol', items: string[] } | null = null;
    let listCounter = 1;

    lines.forEach((line, index) => {
      // Numbered list (1. , 2. , etc.)
      if (/^\d+\.\s/.test(line)) {
        const content = line.replace(/^\d+\.\s/, '').trim();
        if (!currentList || currentList.type !== 'ol') {
          if (currentList) {
            elements.push(renderList(currentList, elements.length));
          }
          currentList = { type: 'ol', items: [] };
          listCounter = 1;
        }
        currentList.items.push(content);
        listCounter++;
      }
      // Bullet list (* or - at start)
      else if (/^[\*\-]\s/.test(line)) {
        const content = line.replace(/^[\*\-]\s/, '').trim();
        if (!currentList || currentList.type !== 'ul') {
          if (currentList) {
            elements.push(renderList(currentList, elements.length));
          }
          currentList = { type: 'ul', items: [] };
        }
        currentList.items.push(content);
      }
      // Nested bullet (starts with spaces/tabs + *)
      else if (/^\s+[\*\-]\s/.test(line)) {
        const content = line.replace(/^\s+[\*\-]\s/, '').trim();
        if (currentList && currentList.items.length > 0) {
          // Add as sub-item to last item
          const lastItemIndex = currentList.items.length - 1;
          currentList.items[lastItemIndex] += '\n  • ' + content;
        }
      }
      // Heading (# , ## , etc.)
      else if (/^#+\s/.test(line)) {
        if (currentList) {
          elements.push(renderList(currentList, elements.length));
          currentList = null;
        }
        const level = line.match(/^#+/)?.[0].length || 1;
        const content = line.replace(/^#+\s/, '').trim();
        const HeadingTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
        elements.push(
          <HeadingTag key={index} className="font-bold text-gray-900 mt-3 mb-2">
            {content}
          </HeadingTag>
        );
      }
      // Empty line
      else if (!line.trim()) {
        if (currentList) {
          elements.push(renderList(currentList, elements.length));
          currentList = null;
        }
      }
      // Regular paragraph
      else {
        if (currentList) {
          elements.push(renderList(currentList, elements.length));
          currentList = null;
        }
        if (line.trim()) {
          elements.push(
            <p key={index} className="text-gray-700 mb-2">
              {formatInlineElements(line)}
            </p>
          );
        }
      }
    });

    // Don't forget the last list if there is one
    if (currentList) {
      elements.push(renderList(currentList, elements.length));
    }

    return <div className="space-y-2">{elements}</div>;
  };

  const renderList = (
    list: { type: 'ul' | 'ol', items: string[] },
    key: number
  ): JSX.Element => {
    const ListTag = list.type === 'ol' ? 'ol' : 'ul';
    const listClass = list.type === 'ol' 
      ? 'list-decimal list-inside space-y-1' 
      : 'list-disc list-inside space-y-1';

    return (
      <ListTag key={key} className={listClass}>
        {list.items.map((item, i) => {
          // Check if item has nested bullets
          if (item.includes('\n  • ')) {
            const [main, ...nested] = item.split('\n  • ');
            return (
              <li key={i} className="text-gray-700">
                {formatInlineElements(main)}
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  {nested.map((nestedItem, j) => (
                    <li key={j} className="text-gray-600">
                      {formatInlineElements(nestedItem)}
                    </li>
                  ))}
                </ul>
              </li>
            );
          }
          return (
            <li key={i} className="text-gray-700">
              {formatInlineElements(item)}
            </li>
          );
        })}
      </ListTag>
    );
  };

  const formatInlineElements = (text: string): React.ReactNode => {
    // Bold: **text** or __text__
    let formatted: React.ReactNode = text;
    
    // Handle bold
    formatted = text.split(/(\*\*.*?\*\*|__.*?__)/).map((part, i) => {
      if (part.startsWith('**') || part.startsWith('__')) {
        const content = part.replace(/^\*\*|\*\*$|^__|__$/g, '');
        return <strong key={i} className="font-semibold">{content}</strong>;
      }
      return part;
    });

    return formatted;
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="border border-gray-300 rounded-md overflow-hidden shadow-sm">
        {/* Mode Toggle Header */}
        <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium text-gray-600">
              {mode === 'edit' ? 'Edit Mode' : 'Preview Mode'}
            </span>
            {mode === 'edit' && (
              <div className="flex items-center text-xs text-blue-600">
                <Info className="w-3 h-3 mr-1" />
                <span>Paste AI-generated text with formatting</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setMode('edit')}
              disabled={disabled}
              className={`px-3 py-1 text-xs rounded flex items-center space-x-1 transition-colors ${
                mode === 'edit'
                  ? 'bg-orange-100 text-orange-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Edit className="w-3 h-3" />
              <span>Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('preview')}
              disabled={disabled}
              className={`px-3 py-1 text-xs rounded flex items-center space-x-1 transition-colors ${
                mode === 'preview'
                  ? 'bg-orange-100 text-orange-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>Preview</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white">
          {mode === 'edit' ? (
            <textarea
              value={value}
              onChange={(e) => !disabled && onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              rows={rows}
              className="w-full px-3 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:text-gray-400 text-sm font-mono resize-y border-0"
            />
          ) : (
            <div className="px-4 py-3 min-h-[150px]">
              {parseMarkdown(value)}
            </div>
          )}
        </div>

        {/* Helper Text */}
        {mode === 'edit' && (
          <div className="bg-gray-50 border-t border-gray-200 px-3 py-2 text-xs text-gray-500">
            <p className="mb-1"><strong>Supported formatting:</strong></p>
            <div className="grid grid-cols-2 gap-2">
              <div>• Numbered lists: <code className="bg-gray-200 px-1 rounded">1. Item</code></div>
              <div>• Bullet lists: <code className="bg-gray-200 px-1 rounded">* Item</code></div>
              <div>• Nested bullets: <code className="bg-gray-200 px-1 rounded">  * Sub-item</code></div>
              <div>• Bold text: <code className="bg-gray-200 px-1 rounded">**bold**</code></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};