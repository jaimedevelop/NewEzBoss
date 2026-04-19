import type { PricingStrategy, MeasurementUnit } from '../../../../../services/inventory/labor/labor.types';
import type { PricingTemplate } from './index';
import type { PricingProfile } from './types';

export const STRATEGIES: { value: PricingStrategy; label: string }[] = [
    { value: 'flat', label: 'Flat Rate' },
    { value: 'tiered', label: 'Tiered' },
    { value: 'measured', label: 'Measured' },
    { value: 'hourly_passthrough', label: 'Hourly Passthrough' },
];

export const UNITS: { value: MeasurementUnit; label: string }[] = [
    { value: 'sqft', label: 'Sq Ft' },
    { value: 'lnft', label: 'Ln Ft' },
    { value: 'each', label: 'Each' },
    { value: 'hours', label: 'Hours' },
];

export const genId = () => Math.random().toString(36).slice(2, 9);

export function blankProfile(): PricingProfile {
    return { id: genId(), name: '', strategy: 'flat', baseRate: 0, isDefault: false };
}

export function previewProfile(p: PricingProfile): string {
    const fmt = (n: number) => `$${n.toLocaleString()}`;
    const unitLabel = UNITS.find(u => u.value === p.unit)?.label ?? 'unit';
    switch (p.strategy) {
        case 'flat': return p.baseRate ? `${fmt(p.baseRate)} flat` : '—';
        case 'tiered': return p.baseRate && p.includedUnits && p.overageRate
            ? `${fmt(p.baseRate)} for ≤${p.includedUnits} ${unitLabel}, then +${fmt(p.overageRate)}/${unitLabel}` : '—';
        case 'measured': return p.baseRate
            ? `${fmt(p.baseRate)}/${unitLabel}${p.minimumCharge ? ` (min ${fmt(p.minimumCharge)})` : ''}` : '—';
        case 'hourly_passthrough': return p.baseRate ? `${fmt(p.baseRate)}/hr` : '—';
        default: return '—';
    }
}

export function scopeLabel(t: Partial<PricingTemplate>): string {
    if (t.categoryName) return `${t.tradeName} › ${t.sectionName} › ${t.categoryName}`;
    if (t.sectionName) return `${t.tradeName} › ${t.sectionName}`;
    if (t.tradeName) return t.tradeName;
    return 'No scope set';
}