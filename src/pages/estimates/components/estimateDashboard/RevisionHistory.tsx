// src/pages/estimates/components/estimateDashboard/RevisionHistory.tsx

import React from 'react';
import { 
  History, Plus, Edit, Trash2, DollarSign, Activity, 
  FileText, User 
} from 'lucide-react';
import { formatDate, formatCurrency, type Revision } from '../../../../services/estimates';

interface RevisionHistoryProps {
  estimate: {
    revisions: Revision[];
    currentRevision: number;
  };
}

// Helper to get icon component
const getIconComponent = (changeType: string) => {
  switch (changeType) {
    case 'line_item_added':
      return Plus;
    case 'line_item_updated':
      return Edit;
    case 'line_item_deleted':
      return Trash2;
    case 'discount_changed':
    case 'tax_changed':
      return DollarSign;
    case 'status_changed':
      return Activity;
    default:
      return FileText;
  }
};

// Helper to get color class
const getColorClass = (changeType: string) => {
  switch (changeType) {
    case 'line_item_added':
      return 'text-green-600 bg-green-50';
    case 'line_item_updated':
      return 'text-blue-600 bg-blue-50';
    case 'line_item_deleted':
      return 'text-red-600 bg-red-50';
    case 'discount_changed':
    case 'tax_changed':
      return 'text-orange-600 bg-orange-50';
    case 'status_changed':
      return 'text-purple-600 bg-purple-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

const RevisionHistory: React.FC<RevisionHistoryProps> = ({ estimate }) => {
  // Sort revisions by revision number (newest first)
  const sortedRevisions = [...(estimate.revisions || [])].sort(
    (a, b) => b.revisionNumber - a.revisionNumber
  );

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Revision History</h2>
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full">
              v{estimate.currentRevision}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {sortedRevisions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No revision history yet</p>
            <p className="text-xs mt-1">Changes will be tracked here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRevisions.map((revision) => {
              const IconComponent = getIconComponent(revision.changeType);
              const colorClass = getColorClass(revision.changeType);
              const totalChanged = revision.newTotal !== revision.previousTotal;

              return (
                <div
                  key={revision.revisionNumber}
                  className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {/* Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
                    <IconComponent className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">
                          Rev {revision.revisionNumber}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500">
                          {formatDate(revision.timestamp)}
                        </span>
                      </div>
                      {totalChanged && (
                        <div className="flex items-center gap-1 text-xs">
                          <span className={
                            revision.newTotal > revision.previousTotal
                              ? 'text-green-600'
                              : 'text-red-600'
                          }>
                            {revision.newTotal > revision.previousTotal ? '+' : ''}
                            {formatCurrency(revision.newTotal - revision.previousTotal)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-900 mb-2">
                      {revision.changes}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span>{revision.modifiedByName}</span>
                      {totalChanged && (
                        <>
                          <span>•</span>
                          <span>
                            {formatCurrency(revision.previousTotal)} → {formatCurrency(revision.newTotal)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RevisionHistory;