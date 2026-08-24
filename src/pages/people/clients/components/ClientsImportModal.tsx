// src/pages/people/clients/components/ClientsImportModal.tsx

import React, { useRef, useState } from 'react';
import { X, Upload, AlertCircle, FileSpreadsheet, Loader2, Copy } from 'lucide-react';
import { useAuthContext } from '../../../../contexts/AuthContext';
import { bulkCreateClients, getClientsGroupedByLetter } from '../../../../services/clients';
import {
  parseClientImportFile,
  computeDuplicateInfo,
  SUPPORTED_IMPORT_EXTENSIONS,
  type ParsedClientRow,
} from './clientImportParser';

interface ClientsImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

type Step = 'select' | 'preview' | 'importing' | 'done';

const ClientsImportModal: React.FC<ClientsImportModalProps> = ({ onClose, onImported }) => {
  const { currentUser } = useAuthContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('select');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ParsedClientRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number } | null>(
    null
  );

  const handleFileSelected = async (file: File) => {
    setParseError(null);
    setFileName(file.name);

    try {
      const parsed = await parseClientImportFile(file);
      if (parsed.length === 0) {
        setParseError(
          'No client rows found. Make sure the first row has column headers (e.g. Name, Email, Phone) and there is at least one data row.'
        );
        return;
      }

      let rowsWithDuplicates = parsed;
      if (currentUser) {
        const existingResult = await getClientsGroupedByLetter(currentUser.uid);
        if (existingResult.success && existingResult.data) {
          const existingClients = Object.values(existingResult.data).flat();
          rowsWithDuplicates = computeDuplicateInfo(parsed, existingClients);
        }
      }

      setRows(rowsWithDuplicates);
      setStep('preview');
    } catch (err) {
      console.error('Error parsing import file:', err);
      setParseError('Could not read this file. Please check the format and try again.');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelected(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelected(file);
  };

  const incompleteCount = rows.filter((r) => !r.isComplete).length;
  const duplicateCount = rows.filter((r) => r.duplicate).length;
  const nonDuplicateCount = rows.length - duplicateCount;

  const handleImport = async (rowsToImport: ParsedClientRow[]) => {
    setStep('importing');
    setImportError(null);

    const result = await bulkCreateClients(rowsToImport.map((r) => r.client));

    if (result.success && result.data) {
      setImportResult({ created: result.data.created.length, skipped: result.data.skipped });
      setStep('done');
      onImported();
    } else {
      setImportError(result.error || 'Failed to import clients');
      setStep('preview');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Import Clients</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
              >
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  Click to select a file, or drag and drop
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supports {SUPPORTED_IMPORT_EXTENSIONS.join(', ')}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORTED_IMPORT_EXTENSIONS.join(',')}
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>

              {parseError && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="mt-4 text-xs text-gray-500">
                The first row should contain column headers such as Name, Email, Phone, Company,
                Billing Address, City, State, Zip. Rows with missing information can still be
                imported — they'll be flagged as incomplete so you can fill them in later.
              </div>
            </div>
          )}

          {(step === 'preview' || step === 'importing') && (
            <div>
              <div className="flex items-center gap-2 mb-3 text-sm text-gray-700">
                <FileSpreadsheet className="w-4 h-4 text-gray-500" />
                <span className="font-medium">{fileName}</span>
                <span className="text-gray-400">
                  &middot; {rows.length} client{rows.length === 1 ? '' : 's'} found
                </span>
                {incompleteCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded">
                    <AlertCircle className="w-3 h-3" />
                    {incompleteCount} incomplete
                  </span>
                )}
                {duplicateCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                    <Copy className="w-3 h-3" />
                    {duplicateCount} possible duplicate{duplicateCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              {importError && (
                <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Row</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Name</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Email</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Phone</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Company</th>
                        <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row) => (
                        <tr key={row.rowNumber}>
                          <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                          <td className="px-3 py-2 text-gray-900">{row.client.name || '—'}</td>
                          <td className="px-3 py-2 text-gray-700">{row.client.email || '—'}</td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.client.phoneMobile || '—'}
                          </td>
                          <td className="px-3 py-2 text-gray-700">
                            {row.client.companyName || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-1">
                              {row.isComplete ? (
                                <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                                  Complete
                                </span>
                              ) : (
                                <span
                                  className="flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded w-fit"
                                  title={`Missing: ${row.missingFields.join(', ')}`}
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  Missing {row.missingFields.length} field
                                  {row.missingFields.length === 1 ? '' : 's'}
                                </span>
                              )}
                              {row.duplicate && (
                                <span
                                  className="flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded w-fit"
                                  title={
                                    row.duplicate.isExact
                                      ? 'EXACT duplicate of an existing client'
                                      : `Matches existing client on: ${row.duplicate.matchedFields.join(', ')}`
                                  }
                                >
                                  <Copy className="w-3 h-3" />
                                  {row.duplicate.isExact ? 'EXACT duplicate' : 'Possible duplicate'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {step === 'done' && importResult && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-gray-900 font-medium">
                Imported {importResult.created} client{importResult.created === 1 ? '' : 's'}
              </p>
              {importResult.skipped > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {importResult.skipped} row{importResult.skipped === 1 ? '' : 's'} skipped
                  (missing a name)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          {step === 'select' && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => {
                  setStep('select');
                  setRows([]);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              {duplicateCount > 0 && (
                <button
                  onClick={() => handleImport(rows.filter((r) => !r.duplicate))}
                  disabled={nonDuplicateCount === 0}
                  className="px-4 py-2 text-orange-700 bg-white border border-orange-300 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import Non-Duplicate Clients ({nonDuplicateCount})
                </button>
              )}
              <button
                onClick={() => handleImport(rows)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Import {rows.length} Client{rows.length === 1 ? '' : 's'}
              </button>
            </>
          )}

          {step === 'importing' && (
            <button
              disabled
              className="flex items-center gap-2 px-4 py-2 bg-orange-400 text-white rounded-lg cursor-not-allowed"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Importing...
            </button>
          )}

          {step === 'done' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientsImportModal;
