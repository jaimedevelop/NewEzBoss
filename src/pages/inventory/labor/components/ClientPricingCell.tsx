import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LaborItem } from '../../../../services/inventory/labor';
import { PricingProfile } from '../../../../services/inventory/labor/labor.types';

interface ClientPricingCellProps {
    item: LaborItem;
}

// Strategy display config
const STRATEGY_CONFIG: Record<string, { label: string; color: string }> = {
    flat: { label: 'Flat Rate', color: 'bg-blue-100 text-blue-800' },
    tiered: { label: 'Tiered', color: 'bg-purple-100 text-purple-800' },
    measured: { label: 'Measured', color: 'bg-orange-100 text-orange-800' },
    hourly_passthrough: { label: 'Hourly Passthrough', color: 'bg-green-100 text-green-800' },
};

const UNIT_LABELS: Record<string, string> = {
    sqft: 'sq ft',
    lnft: 'ln ft',
    each: 'each',
    hours: 'hr',
};

const fmt = (n: number) => `$${n.toFixed(2)}`;

function buildPreview(profile: PricingProfile): string {
    switch (profile.strategy) {
        case 'flat':
            return `${fmt(profile.baseRate)} flat charge`;
        case 'tiered': {
            const unit = profile.unit ? UNIT_LABELS[profile.unit] ?? profile.unit : 'units';
            const included = profile.includedUnits ?? 0;
            const overage = profile.overageRate ?? 0;
            return included > 0
                ? `${fmt(profile.baseRate)} for ≤${included} ${unit}, then +${fmt(overage)}/${unit}`
                : `${fmt(profile.baseRate)} base, +${fmt(overage)}/${unit} overage`;
        }
        case 'measured': {
            const unit = profile.unit ? UNIT_LABELS[profile.unit] ?? profile.unit : 'units';
            const min = profile.minimumCharge;
            return min
                ? `${fmt(profile.baseRate)}/${unit} (min ${fmt(min)})`
                : `${fmt(profile.baseRate)}/${unit}`;
        }
        case 'hourly_passthrough':
            return `${fmt(profile.baseRate)}/hr passthrough`;
        default:
            return `${fmt(profile.baseRate)}`;
    }
}

function PopoverContent({ item, profile }: { item: LaborItem; profile: PricingProfile | null }) {
    // Case 1: has pricing profiles
    if (profile && item.pricingProfiles && item.pricingProfiles.length > 0) {
        return (
            <div className="space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Client Pricing Profiles
                </div>
                {item.pricingProfiles.map((p) => {
                    const cfg = STRATEGY_CONFIG[p.strategy] ?? { label: p.strategy, color: 'bg-gray-100 text-gray-800' };
                    const isDefault = p.isDefault;
                    return (
                        <div
                            key={p.id}
                            className={`rounded-lg border p-3 ${isDefault ? 'border-purple-200 bg-purple-50' : 'border-gray-100 bg-gray-50'}`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-medium text-gray-900">{p.name}</span>
                                <div className="flex items-center gap-1.5">
                                    {isDefault && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-200 text-purple-800 font-medium">
                                            Default
                                        </span>
                                    )}
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.color}`}>
                                        {cfg.label}
                                    </span>
                                </div>
                            </div>
                            <div className="text-sm text-gray-700">{buildPreview(p)}</div>
                            {p.strategy === 'tiered' && p.unit && (
                                <div className="text-xs text-gray-400 mt-1">
                                    Unit: {UNIT_LABELS[p.unit] ?? p.unit}
                                </div>
                            )}
                            {p.strategy === 'measured' && p.unit && (
                                <div className="text-xs text-gray-400 mt-1">
                                    Per: {UNIT_LABELS[p.unit] ?? p.unit}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    // Case 2: legacy flat rates only
    if (item.flatRates && item.flatRates.length > 0) {
        return (
            <div className="space-y-3">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Flat Rates
                </div>
                {item.flatRates.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                        <span className="text-sm text-gray-700">{r.name}</span>
                        <span className="text-sm font-semibold text-blue-800">{fmt(r.rate)}</span>
                    </div>
                ))}
                {item.estimatedHours && (
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                        <span>Estimated Hours</span>
                        <span>{item.estimatedHours}h</span>
                    </div>
                )}
            </div>
        );
    }

    return <p className="text-sm text-gray-400">No client pricing configured.</p>;
}

export const ClientPricingCell: React.FC<ClientPricingCellProps> = ({ item }) => {
    const [visible, setVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const badgeRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Determine default profile
    const defaultProfile: PricingProfile | null =
        item.pricingProfiles && item.pricingProfiles.length > 0
            ? (item.pricingProfiles.find((p) => p.isDefault) ?? item.pricingProfiles[0])
            : null;

    // Determine badge config
    const getBadgeConfig = (): { label: string; color: string } | null => {
        if (defaultProfile) {
            return STRATEGY_CONFIG[defaultProfile.strategy] ?? { label: defaultProfile.strategy, color: 'bg-gray-100 text-gray-800' };
        }
        if (item.flatRates && item.flatRates.length > 0) {
            return STRATEGY_CONFIG['flat'];
        }
        return null;
    };

    const badgeCfg = getBadgeConfig();

    const show = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (!badgeRef.current) return;
        const rect = badgeRef.current.getBoundingClientRect();
        // Position below the badge, aligned left; clamp to viewport right edge later via CSS
        setCoords({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
        setVisible(true);
    };

    const hide = () => {
        timerRef.current = setTimeout(() => setVisible(false), 120);
    };

    const keepOpen = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    if (!badgeCfg) {
        return <span className="text-sm text-gray-400">-</span>;
    }

    return (
        <>
            <div
                ref={badgeRef}
                className="inline-block"
                onMouseEnter={show}
                onMouseLeave={hide}
            >
                <span
                    className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded cursor-default select-none ${badgeCfg.color}`}
                >
                    {badgeCfg.label}
                </span>
            </div>

            {visible && createPortal(
                <div
                    ref={popoverRef}
                    onMouseEnter={keepOpen}
                    onMouseLeave={hide}
                    style={{ top: coords.top, left: coords.left, maxWidth: 320, minWidth: 240 }}
                    className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-4"
                >
                    {/* Arrow */}
                    <div
                        className="absolute -top-1.5 left-4 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45"
                    />
                    <PopoverContent item={item} profile={defaultProfile} />
                </div>,
                document.body
            )}
        </>
    );
};

export default ClientPricingCell;