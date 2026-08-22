import { estimatesApiRequest } from './estimatesApi';
import { groupsToApiPayload, lineItemsToApiPayload } from './estimates.mapper';
import { getEstimate } from './estimates.queries';
import type { ClientViewSettings, EstimateGroup, LineItem } from './estimates.types';

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
    lineItems?: LineItem[]
): Promise<void> => {
    try {
        const body: Record<string, any> = {
            settings: {
                displayMode: settings.displayMode,
                showItemPrices: settings.showItemPrices,
                showGroupPrices: settings.showGroupPrices,
                showSubtotal: settings.showSubtotal,
                showTax: settings.showTax,
                showTotal: settings.showTotal,
                hiddenLineItems: (settings.hiddenLineItems ?? []).map(id => Number(id)),
            },
            groups: groupsToApiPayload(groups ?? []),
        };
        if (lineItems) {
            body.lineItems = lineItemsToApiPayload(lineItems);
        }

        await estimatesApiRequest(`/estimates/${estimateId}/client-view-settings`, {
            method: 'PUT',
            body: JSON.stringify(body),
        });
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

        const payload: Record<string, number | null> = {};
        for (const [lineItemId, groupId] of Object.entries(itemGroupAssignments)) {
            payload[lineItemId] = groupId ? Number(groupId) : null;
        }

        await estimatesApiRequest(`/estimates/${estimateId}/line-items/groups`, {
            method: 'PUT',
            body: JSON.stringify({ itemGroupAssignments: payload }),
        });
    } catch (error) {
        console.error('Error updating line items groups:', error);
        throw error;
    }
};
