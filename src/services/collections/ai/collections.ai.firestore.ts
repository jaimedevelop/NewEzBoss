import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { AISettings } from './collections.ai.types';

const USER_SETTINGS_COLLECTION = 'userSettings';
const AI_SETTINGS_FIELD = 'aiSettings';

// Fields that are safe to persist to Firestore (no API keys)
export interface AIFirestoreSettings {
    provider: AISettings['provider'];
    modelId: AISettings['modelId'];
    customProviders: AISettings['customProviders'];
    customModels: AISettings['customModels'];
    activeCustomProviderId?: AISettings['activeCustomProviderId'];
}

function extractFirestoreFields(s: AISettings): AIFirestoreSettings {
    return {
        provider: s.provider,
        modelId: s.modelId,
        customProviders: s.customProviders ?? [],
        customModels: s.customModels ?? [],
        activeCustomProviderId: s.activeCustomProviderId,
    };
}

export async function loadAISettingsFromFirestore(userId: string): Promise<AIFirestoreSettings | null> {
    try {
        const ref = doc(db, USER_SETTINGS_COLLECTION, userId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return null;
        const data = snap.data();
        return (data?.[AI_SETTINGS_FIELD] as AIFirestoreSettings) ?? null;
    } catch (err) {
        console.error('Failed to load AI settings from Firestore:', err);
        return null;
    }
}

export async function saveAISettingsToFirestore(userId: string, s: AISettings): Promise<void> {
    try {
        const ref = doc(db, USER_SETTINGS_COLLECTION, userId);
        await setDoc(ref, {
            [AI_SETTINGS_FIELD]: extractFirestoreFields(s),
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (err) {
        console.error('Failed to save AI settings to Firestore:', err);
    }
}