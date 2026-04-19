import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../../../firebase/config';
import type { PricingTemplate } from '../../ClientPricingTemplates/types';

interface Scope {
    tradeId: string;
    sectionId: string;
    categoryId: string;
}

/**
 * Loads all templates for a user and returns those that match the current
 * item's hierarchy scope, ordered by specificity (category > section > trade).
 *
 * A template matches if every scope field it declares equals the item's field.
 * A template with no scope fields set matches any item (lowest priority).
 */
function scoreTemplate(t: PricingTemplate, scope: Scope): number {
    // Must match all declared fields; if any declared field doesn't match → no match
    if (t.tradeId && t.tradeId !== scope.tradeId) return -1;
    if (t.sectionId && t.sectionId !== scope.sectionId) return -1;
    if (t.categoryId && t.categoryId !== scope.categoryId) return -1;

    // Score by specificity
    if (t.categoryId) return 3;
    if (t.sectionId) return 2;
    if (t.tradeId) return 1;
    return 0; // no scope → global template, lowest priority
}

export function useTemplateRecommendations(userId: string | undefined, scope: Scope) {
    const [all, setAll] = useState<PricingTemplate[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) return;
        setLoading(true);
        const q = query(
            collection(db, 'labor_pricing_templates'),
            where('userId', '==', userId),
        );
        getDocs(q)
            .then(snap => setAll(snap.docs.map(d => ({ id: d.id, ...d.data() } as PricingTemplate))))
            .catch(() => setAll([]))
            .finally(() => setLoading(false));
    }, [userId]);

    // Re-compute matches whenever scope or template list changes
    const matched = all
        .map(t => ({ t, score: scoreTemplate(t, scope) }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score)
        .map(({ t }) => t);

    return { templates: all, matched, loading };
}

