// src/mainComponents/forms/AutoFormatTextarea.tsx
import React, { useState, useEffect } from 'react';
import { Sparkles, RotateCcw, Info } from 'lucide-react';

interface AutoFormatTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  label?: string;
}

interface ParsedStep {
  heading: string;
  subSteps: string[];
}

export const AutoFormatTextarea: React.FC<AutoFormatTextareaProps> = ({
  value,
  onChange,
  placeholder = 'Paste AI-generated text here...',
  disabled = false,
  rows = 12,
  label
}) => {
  const [rawText, setRawText] = useState(value);
  const [autoFormatted, setAutoFormatted] = useState(false);

  // Improved parser that detects indentation
  const parseAndFormat = (text: string): string => {
    if (!text || !text.trim()) return '';

    const lines = text.split('\n');
    const steps: ParsedStep[] = [];
    let currentStep: ParsedStep | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        continue;
      }

      // Detect indentation (leading spaces/tabs)
      const indentMatch = line.match(/^(\s+)/);
      const indentLevel = indentMatch ? indentMatch[1].length : 0;
      
      // Check if it's a bullet point (starts with * or - after optional whitespace)
      const isBullet = /^[\s]*[\*\-]\s/.test(line);
      const bulletContent = trimmedLine.replace(/^[\*\-]\s/, '');

      // Decision tree for categorization
      if (indentLevel > 0 && isBullet) {
        // INDENTED BULLET = Always a sub-step
        if (currentStep) {
          currentStep.subSteps.push(bulletContent);
        } else {
          // Orphan indented bullet - create a step for it
          currentStep = {
            heading: bulletContent,
            subSteps: []
          };
        }
      } else if (indentLevel === 0 && isBullet) {
        // NON-INDENTED BULLET = Check if next line is indented
        // Look ahead to see if there are nested bullets
        let hasNestedBullets = false;
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextIndent = nextLine.match(/^(\s+)/);
          const nextIsIndented = nextIndent && nextIndent[1].length > 0;
          const nextIsBullet = /^[\s]*[\*\-]\s/.test(nextLine);
          
          hasNestedBullets = nextIsIndented && nextIsBullet;
        }

        if (hasNestedBullets) {
          // This bullet is a MAIN STEP (it has nested items)
          if (currentStep) {
            steps.push(currentStep);
          }
          currentStep = {
            heading: bulletContent,
            subSteps: []
          };
        } else {
          // This bullet is a SUB-STEP (no nested items)
          if (currentStep) {
            currentStep.subSteps.push(bulletContent);
          } else {
            // Orphan bullet with no current step
            currentStep = {
              heading: bulletContent,
              subSteps: []
            };
          }
        }
      } else {
        // NON-BULLET LINE = Always a main step heading
        if (currentStep) {
          steps.push(currentStep);
        }
        currentStep = {
          heading: trimmedLine,
          subSteps: []
        };
      }
    }

    // Don't forget the last step
    if (currentStep) {
      steps.push(currentStep);
    }

    // Format the steps into numbered list
    let formatted = '';
    steps.forEach((step, index) => {
      // Add numbered heading
      formatted += `${index + 1}. ${step.heading}\n`;
      
      // Add sub-steps with bullets
      step.subSteps.forEach(subStep => {
        formatted += `   • ${subStep}\n`;
      });
      
      // Add blank line between steps (except last)
      if (index < steps.length - 1) {
        formatted += '\n';
      }
    });

    return formatted;
  };

  // Auto-format when text is pasted
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (disabled) return;
    
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    
    // Parse and format
    const formatted = parseAndFormat(pastedText);
    
    if (formatted) {
      setRawText(formatted);
      onChange(formatted);
      setAutoFormatted(true);
      
      // Reset indicator after 3 seconds
      setTimeout(() => setAutoFormatted(false), 3000);
    }
  };

  // Manual format button
  const handleManualFormat = () => {
    if (disabled || !rawText) return;
    
    const formatted = parseAndFormat(rawText);
    setRawText(formatted);
    onChange(formatted);
    setAutoFormatted(true);
    
    setTimeout(() => setAutoFormatted(false), 3000);
  };

  // Reset to unformatted
  const handleReset = () => {
    if (disabled) return;
    setRawText('');
    onChange('');
  };

  // Sync external value changes
  useEffect(() => {
    if (value !== rawText) {
      setRawText(value);
    }
  }, [value]);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
        {/* Header with Auto-Format Indicator */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b border-orange-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className={`w-4 h-4 ${autoFormatted ? 'text-orange-600 animate-pulse' : 'text-orange-500'}`} />
              <span className="text-sm font-medium text-orange-900">
                {autoFormatted ? 'Auto-Formatted! ✓' : 'Smart Auto-Format (Detects Indentation)'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {rawText && (
                <>
                  <button
                    type="button"
                    onClick={handleManualFormat}
                    disabled={disabled}
                    className="px-3 py-1 text-xs font-medium bg-white border border-orange-300 text-orange-700 rounded hover:bg-orange-50 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    Re-format
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={disabled}
                    className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3 inline mr-1" />
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div className="bg-white relative">
          <textarea
            value={rawText}
            onChange={(e) => {
              if (!disabled) {
                setRawText(e.target.value);
                onChange(e.target.value);
              }
            }}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            className="w-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:text-gray-400 text-sm resize-y border-0 font-mono"
            style={{ tabSize: 3 }}
          />
          
          {/* Paste Hint Overlay (only when empty) */}
          {!rawText && !disabled && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-white bg-opacity-90 border-2 border-dashed border-orange-300 rounded-lg p-6 text-center max-w-md">
                <Sparkles className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Paste AI-generated text here
                </p>
                <p className="text-xs text-gray-500">
                  Automatically detects indentation and creates numbered steps with bullets
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
          <div className="flex items-start space-x-2 text-xs text-gray-600">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <div>
                <p className="font-medium text-gray-700 mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Plain text or non-indented bullets with nested items</strong> → Main steps (numbered)</li>
                  <li><strong>Indented bullets (spaces/tabs before *)</strong> → Sub-steps (bullets)</li>
                  <li><strong>Non-indented bullets without nested items</strong> → Sub-steps (bullets)</li>
                </ul>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <p className="font-medium text-gray-700 mb-1">Examples:</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold mb-1">✅ Works perfectly:</p>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`Remove old seat
* Locate bolts
* Unscrew bolts
Clean area
   * Wipe rim
   * Remove residue`}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">📋 Result:</p>
                    <pre className="bg-green-50 p-2 rounded text-xs overflow-x-auto">
{`1. Remove old seat
   • Locate bolts
   • Unscrew bolts

2. Clean area
   • Wipe rim
   • Remove residue`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};