import { useState, useEffect } from 'react';
import { getProductTrades, type ProductTrade } from '../../../../../services/categories/trades';
import {
    getSections, getCategories,
    type LaborSection, type LaborCategory,
} from '../../../../../services/inventory/labor';

export function useHierarchy(userId: string | undefined, tradeId: string, sectionId: string) {
    const [trades, setTrades] = useState<ProductTrade[]>([]);
    const [sections, setSections] = useState<LaborSection[]>([]);
    const [categories, setCategories] = useState<LaborCategory[]>([]);

    useEffect(() => {
        if (!userId) return;
        getProductTrades(userId).then(r => { if (r.success && r.data) setTrades(r.data); });
    }, [userId]);

    useEffect(() => {
        if (!tradeId || !userId) { setSections([]); setCategories([]); return; }
        getSections(tradeId, userId).then(r => { setSections(r.success && r.data ? r.data : []); });
        setCategories([]);
    }, [tradeId, userId]);

    useEffect(() => {
        if (!sectionId || !userId) { setCategories([]); return; }
        getCategories(sectionId, userId).then(r => { setCategories(r.success && r.data ? r.data : []); });
    }, [sectionId, userId]);

    return { trades, sections, categories };
}