export type AIProvider = 'anthropic' | 'openai' | 'google' | 'deepseek';

export interface AIModel {
    id: string;
    name: string;
    provider: AIProvider;
    contextWindow: number;
}

export interface AISettings {
    provider: AIProvider;
    modelId: string;
    apiKey: string;
}

export interface AIMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface AIInventoryItem {
    id: string;
    name: string;
    trade: string;
    section: string;
    category: string;
    subcategory?: string;
    type?: string;
    unitPrice?: number;
    sku?: string;
}

export interface AILaborItem {
    id: string;
    name: string;
    trade: string;
    section: string;
    category: string;
    flatRate?: number;
    hourlyRate?: number;
}

export interface AIToolItem {
    id: string;
    name: string;
    tradeName: string;
    sectionName: string;
    categoryName: string;
    subcategoryName?: string;
    minimumCustomerCharge?: number;
}

export interface AIEquipmentItem {
    id: string;
    name: string;
    tradeName: string;
    sectionName: string;
    categoryName: string;
    subcategoryName?: string;
    minimumCustomerCharge?: number;
}

export interface AIInventoryContext {
    products: AIInventoryItem[];
    labor: AILaborItem[];
    tools: AIToolItem[];
    equipment: AIEquipmentItem[];
}

export interface AISelectedItem {
    id: string;
    quantity: number;
    reason?: string;
}

export interface AICollectionResult {
    name: string;
    description: string;
    trade: string;
    selectedProducts: AISelectedItem[];
    selectedLabor: AISelectedItem[];
    selectedTools: AISelectedItem[];
    selectedEquipment: AISelectedItem[];
}

export interface AICreationState {
    messages: AIMessage[];
    isLoading: boolean;
    inventoryLoaded: boolean;
    inventoryContext: AIInventoryContext | null;
    result: AICollectionResult | null;
    error: string | null;
}