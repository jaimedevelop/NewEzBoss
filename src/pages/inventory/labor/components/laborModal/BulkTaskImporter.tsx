// src/pages/labor/components/laborModal/BulkTaskImporter.tsx
import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle, X } from 'lucide-react';

interface ParsedTask {
  name: string;
  description: string;
}

interface BulkTaskImporterProps {
  onImport: (tasks: ParsedTask[]) => void;
  onClose: () => void;
}

export const BulkTaskImporter: React.FC<BulkTaskImporterProps> = ({
  onImport,
  onClose
}) => {
  const [rawText, setRawText] = useState('');
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [error, setError] = useState('');

  // Parse the formatted text into tasks
  const parseText = (text: string): ParsedTask[] => {
    if (!text || !text.trim()) return [];

    const lines = text.split('\n');
    const tasks: ParsedTask[] = [];
    let currentTask: ParsedTask | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;

      // Check if it's a numbered task heading (e.g., "1: Task name")
      const taskMatch = trimmedLine.match(/^(\d+):\s*(.+)/);
      
      if (taskMatch) {
        // Save previous task if exists
        if (currentTask) {
          tasks.push(currentTask);
        }
        
        // Start new task
        const taskName = taskMatch[2].trim();
        currentTask = {
          name: taskName,
          description: ''
        };
      } 
      // Check if it's a bullet point (starts with #)
      else if (trimmedLine.startsWith('#')) {
        const bulletContent = trimmedLine.substring(1).trim();
        
        if (currentTask) {
          // Add to current task's description
          if (currentTask.description) {
            currentTask.description += '\n';
          }
          currentTask.description += `• ${bulletContent}`;
        }
      }
      // Any other line format
      else {
        // If we have a current task, add as description line
        if (currentTask) {
          if (currentTask.description) {
            currentTask.description += '\n';
          }
          currentTask.description += trimmedLine;
        }
      }
    }

    // Don't forget the last task
    if (currentTask) {
      tasks.push(currentTask);
    }

    return tasks;
  };

  const handleParse = () => {
    setError('');
    
    if (!rawText.trim()) {
      setError('Please paste some text first');
      return;
    }

    const tasks = parseText(rawText);
    
    if (tasks.length === 0) {
      setError('No valid tasks found. Make sure your text uses the format:\n1: Task name\n# Bullet point\n# Bullet point');
      return;
    }

    setParsedTasks(tasks);
  };

  const handleImport = () => {
    if (parsedTasks.length === 0) {
      setError('No tasks to import');
      return;
    }

    onImport(parsedTasks);
    onClose();
  };

const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Capture the value immediately before React recycles the event
    const pastedValue = e.currentTarget.value;
    
    // Auto-parse on paste
    setTimeout(() => {
      const tasks = parseText(pastedValue);
      if (tasks.length > 0) {
        setParsedTasks(tasks);
        setError('');
      }
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-yellow-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Upload className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Import Multiple Tasks</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Input Side */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Paste Your Text</h3>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                onPaste={handlePaste}
                placeholder="Paste your formatted text here...

Example:
1: Remove the old toilet seat
# Locate the bolts
# Unscrew the bolts
# Remove the seat
2: Clean the area
# Wipe down the rim
# Remove residue"
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm font-mono resize-none"
              />
              
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                <h4 className="text-xs font-semibold text-blue-900 mb-2">Required Format:</h4>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>• <code className="bg-blue-100 px-1 rounded">1: Task name</code> → Creates a task</li>
                  <li>• <code className="bg-blue-100 px-1 rounded"># Bullet point</code> → Adds to description</li>
                  <li>• Tasks are auto-numbered (1:, 2:, 3:, etc.)</li>
                </ul>
              </div>

              {error && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-md p-3 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 whitespace-pre-line">{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleParse}
                className="mt-3 w-full px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                Parse Tasks
              </button>
            </div>

            {/* Preview Side */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Preview ({parsedTasks.length} tasks found)
              </h3>
              
              <div className="border border-gray-300 rounded-md h-64 overflow-y-auto bg-gray-50">
                {parsedTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    Parsed tasks will appear here
                  </div>
                ) : (
                  <div className="p-4 space-y-4">
                    {parsedTasks.map((task, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                        <div className="flex items-start space-x-2 mb-2">
                          <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-semibold">
                            {index + 1}
                          </span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm text-gray-900">{task.name}</h4>
                          </div>
                        </div>
                        {task.description && (
                          <div className="ml-8 text-xs text-gray-600 whitespace-pre-line">
                            {task.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {parsedTasks.length > 0 && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-md p-3 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-800">
                    Ready to import <strong>{parsedTasks.length} tasks</strong>. Click "Import Tasks" to add them.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={parsedTasks.length === 0}
            className="px-4 py-2 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import {parsedTasks.length > 0 ? `${parsedTasks.length} Tasks` : 'Tasks'}
          </button>
        </div>
      </div>
    </div>
  );
};