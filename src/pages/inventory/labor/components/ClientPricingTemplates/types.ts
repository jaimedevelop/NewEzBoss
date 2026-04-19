import type { PricingProfile } from '../../../../../services/inventory/labor/labor.types';

// Re-export PricingProfile so consumers can import from one place
export type { PricingProfile };

export interface PricingTemplate {
    id: string;
    name: string;
    description: string;
    profiles: PricingProfile[];
    tradeId?: string;
    tradeName?: string;
    sectionId?: string;
    sectionName?: string;
    categoryId?: string;
    categoryName?: string;
    userId: string;
    createdAt?: any;
    updatedAt?: any;
}

export type ScopeLevel = 'trade' | 'section' | 'category';
export type ViewMode = 'list' | 'create' | 'edit' | 'apply';