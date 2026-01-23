import { getEstimate } from './estimates.queries';
import { updateEstimate } from './estimates.mutations';
import type { ClientViewSettings, EstimateGroup } from './estimates.types';

/**
 * Update client view settings and groups
 * @param estimateId - The estimate ID
 * @param settings - The new settings
 * @param groups - The new groups
 */
export const updateClientViewSettings = async (
    estimateId: string,
    settings: ClientViewSettings,
    groups?: EstimateGroup[],
    lineItems?: any[]
): Promise<void> => {
    try {
        const updates: any = {
            clientViewSettings: settings,
            groups: groups || []
        };
        if (lineItems) {
            updates.lineItems = lineItems;
        }
        await updateEstimate(estimateId, updates);
    } catch (error) {
        console.error('Error updating client view settings:', error);
        throw error;
    }
};

/**
 * Update grouping for multiple line items
 * @param estimateId - The estimate ID
 * @param itemGroupAssignments - Map of line item ID to group ID
 */
export const updateLineItemsGroups = async (
    estimateId: string,
    itemGroupAssignments: Record<string, string | null>
): Promise<void> => {
    try {
        const estimate = await getEstimate(estimateId);
        if (!estimate) throw new Error('Estimate not found');

        const updatedLineItems = (estimate.lineItems || []).map(item => {
            if (item.id in itemGroupAssignments) {
                return {
                    ...item,
                    groupId: itemGroupAssignments[item.id] || undefined
                };
            }
            return item;
        });

        await updateEstimate(estimateId, {
            lineItems: updatedLineItems
        });
    } catch (error) {
        console.error('Error updating line items groups:', error);
        throw error;
    }
};
