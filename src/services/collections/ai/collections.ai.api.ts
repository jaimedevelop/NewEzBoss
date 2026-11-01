import { collectionsApiRequest } from '../collectionsApi';
import type { AISettings } from './collections.ai.types';
export type StoredAISettings = Omit<AISettings, 'apiKey' | 'apiKeys'>;
export interface AISettingsRecord { settings: StoredAISettings | null; version: number; }
export function settingsMetadata(s: AISettings): StoredAISettings {
  return {provider:s.provider,modelId:s.modelId,customProviders:s.customProviders.map(({id,label,baseUrl,apiKeyLabel})=>({id,label,baseUrl,...(apiKeyLabel?{apiKeyLabel}:{})})),customModels:s.customModels,
    ...(s.activeCustomProviderId ? {activeCustomProviderId:s.activeCustomProviderId}:{}), ...(s.modelIdsByProvider ? {modelIdsByProvider:s.modelIdsByProvider}:{})};
}
export const loadAPISettings = () => collectionsApiRequest<AISettingsRecord>('/collection-ai-settings');
export const saveAPISettings = (s: AISettings, version:number) => collectionsApiRequest<AISettingsRecord>('/collection-ai-settings', {method:'PUT',body:JSON.stringify({settings:settingsMetadata(s),version})});
