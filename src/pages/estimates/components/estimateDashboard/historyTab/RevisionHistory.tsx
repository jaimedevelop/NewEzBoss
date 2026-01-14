import React, { useState, useMemo } from 'react';
import { History, Calendar } from 'lucide-react';
import { formatDate, formatCurrency, type EstimateWithId, type LineItem, type Revision } from '../../../../../services/estimates';

interface RevisionHistoryProps {
  estimate: EstimateWithId;
}

interface RevisionTab {
  date: string;
  displayDate: string;
  revisions: Revision[];
}

interface LineItemWithStatus extends LineItem {
  status: 'normal' | 'added' | 'removed';
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const RevisionHistory: React.FC<RevisionHistoryProps> = ({ estimate }) => {
  // Group revisions by date
  const revisionTabs = useMemo(() => {
    const revisions = estimate.revisionsHistory || [];
    if (revisions.length === 0) return [];

    const tabs = new Map<string, RevisionTab>();

    revisions.forEach((revision) => {
      // Parse the date - handle both Firestore Timestamp and string formats
      let date: Date;
      if (revision.date?.toDate) {
        // Firestore Timestamp
        date = revision.date.toDate();
      } else if (typeof revision.date === 'string') {
        date = new Date(revision.date);
      } else {
        date = new Date();
      }

      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const displayDate = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: '2-digit'
      });

      if (!tabs.has(dateKey)) {
        tabs.set(dateKey, {
          date: dateKey,
          displayDate,
          revisions: []
        });
      }

      tabs.get(dateKey)!.revisions.push(revision);
    });

    // Convert to array and sort by date (EARLIEST FIRST)
    return Array.from(tabs.values()).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [estimate.revisionsHistory]);

  const [activeTabIndex, setActiveTabIndex] = useState(0);

  // Calculate line items with their status for the selected tab
  const lineItemsWithStatus = useMemo(() => {
    if (revisionTabs.length === 0) {
      return estimate.lineItems.map(item => ({
        ...item,
        status: 'normal' as const
      }));
    }

    const activeTab = revisionTabs[activeTabIndex];
    const addedIds = new Set<string>();
    const removedIds = new Set<string>();
    const removedItems: LineItem[] = [];

    // Track which items were added/removed in this tab's revisions
    activeTab.revisions.forEach(revision => {
      if (revision.changeType === 'line_item_added' && revision.details?.lineItemId) {
        addedIds.add(revision.details.lineItemId);
      } else if (revision.changeType === 'line_item_deleted' && revision.details?.lineItemId) {
        removedIds.add(revision.details.lineItemId);
        // Add the deleted item if we have it
        if (revision.details?.deletedItem) {
          removedItems.push(revision.details.deletedItem);
        }
      }
    });

    // Map current line items with status
    const items: LineItemWithStatus[] = estimate.lineItems.map(item => {
      let status: 'normal' | 'added' | 'removed' = 'normal';

      if (addedIds.has(item.id!)) {
        status = 'added';
      } else if (removedIds.has(item.id!)) {
        status = 'removed';
      }

      return { ...item, status };
    });

    // Add removed items that aren't in current line items
    removedItems.forEach(removedItem => {
      if (!items.find(i => i.id === removedItem.id)) {
        items.push({ ...removedItem, status: 'removed' });
      }
    });

    return items;
  }, [revisionTabs, activeTabIndex, estimate.lineItems]);

  // Empty state
  if (!estimate.revisionsHistory || estimate.revisionsHistory.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">Revision History</h2>
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full">
              v{estimate.currentRevision || 0}
            </span>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8 text-gray-500">
            <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No revision history yet</p>
            <p className="text-xs mt-1">Changes will be tracked here</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Revision History</h2>
          <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full">
            v{estimate.currentRevision || 0}
          </span>
        </div>
      </div>

      {/* Date Tabs */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="flex overflow-x-auto">
          {revisionTabs.map((tab, index) => (
            <button
              key={tab.date}
              onClick={() => setActiveTabIndex(index)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 whitespace-nowrap transition-colors
                ${activeTabIndex === index
                  ? 'border-purple-600 text-purple-600 bg-white'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <Calendar className="w-4 h-4" />
              <span className="font-medium">{tab.displayDate}</span>
              <span className="text-xs bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                {tab.revisions.length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">
            Changes on {revisionTabs[activeTabIndex].displayDate}
          </h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-green-500"></div>
              <span className="text-gray-600">Added</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-red-500"></div>
              <span className="text-gray-600">Removed</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lineItemsWithStatus.map((item, index) => (
                <tr
                  key={item.id || index}
                  className={`
                    ${item.status === 'removed' ? 'bg-red-50' : ''}
                    ${item.status === 'added' ? 'bg-green-50' : ''}
                  `}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`
                        ${item.status === 'normal' ? 'text-gray-900' : ''}
                        ${item.status === 'added' ? 'text-gray-900 underline decoration-green-500 decoration-2' : ''}
                        ${item.status === 'removed' ? 'text-gray-400 line-through underline decoration-red-500 decoration-2' : ''}
                      `}
                    >
                      {item.description}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`
                        ${item.status === 'normal' ? 'text-gray-900' : ''}
                        ${item.status === 'added' ? 'text-gray-900 underline decoration-green-500 decoration-2' : ''}
                        ${item.status === 'removed' ? 'text-gray-400 line-through underline decoration-red-500 decoration-2' : ''}
                      `}
                    >
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`
                        ${item.status === 'normal' ? 'text-gray-900' : ''}
                        ${item.status === 'added' ? 'text-gray-900 underline decoration-green-500 decoration-2' : ''}
                        ${item.status === 'removed' ? 'text-gray-400 line-through underline decoration-red-500 decoration-2' : ''}
                      `}
                    >
                      {formatCurrency(item.unitPrice)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`
                        font-medium
                        ${item.status === 'normal' ? 'text-gray-900' : ''}
                        ${item.status === 'added' ? 'text-gray-900 underline decoration-green-500 decoration-2' : ''}
                        ${item.status === 'removed' ? 'text-gray-400 line-through underline decoration-red-500 decoration-2' : ''}
                      `}
                    >
                      {formatCurrency(item.total)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Change Summary */}
        <div className="mt-4 space-y-2">
          {revisionTabs[activeTabIndex].revisions.map((revision, idx) => {
            // Parse timestamp
            let timestamp: Date;
            if (revision.date?.toDate) {
              timestamp = revision.date.toDate();
            } else if (typeof revision.date === 'string') {
              timestamp = new Date(revision.date);
            } else {
              timestamp = new Date();
            }

            return (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded"
              >
                <span className="font-medium text-gray-700">
                  Rev {revision.revisionNumber}:
                </span>
                <span>{revision.changes}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">{revision.modifiedByName || 'Unknown'}</span>
                <span className="text-gray-400">at</span>
                <span className="text-gray-500">{formatTime(timestamp)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RevisionHistory;