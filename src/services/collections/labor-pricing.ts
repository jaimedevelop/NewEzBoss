import type { HourlyRate, LaborItem, PricingProfile } from '../inventory/labor/labor.types';
import type { ItemSelection } from './collections.types';

export interface LaborPricingResult {
  effectiveHours: number;
  workingDays: number;
  employeeHours: number;
  selectedProfile?: PricingProfile;
  selectedContractorRate?: HourlyRate;
  baseCharge: number;
  overageCharge: number;
  additionalScopeCharge: number;
  clientTotal: number;
  contractorCost: number;
  errors: string[];
}

const finiteNonNegative = (value: unknown, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

/**
 * Resolves one collection labor row. Client packages are per job, never per
 * worker. `workingDays` affects contractor cost only until a client multi-day
 * billing policy is selected.
 */
export function calculateLaborPricing(
  labor: LaborItem,
  selection: ItemSelection,
  additionalCharge?: { rate: number; quantity?: number },
): LaborPricingResult {
  const errors: string[] = [];
  const profiles = labor.pricingProfiles ?? [];
  const contractorRates = labor.hourlyRates ?? [];
  const selectedProfile = selection.selectedClientProfileId
    ? profiles.find(profile => profile.id === selection.selectedClientProfileId)
    : undefined;
  const selectedContractorRate = selection.selectedContractorRateId
    ? contractorRates.find(rate => rate.id === selection.selectedContractorRateId)
    : undefined;
  if (!selectedProfile) errors.push(selection.selectedClientProfileId ? 'Selected client pricing profile no longer exists.' : 'Select a client pricing profile.');
  if (!selectedContractorRate) errors.push(selection.selectedContractorRateId ? 'Selected contractor rate no longer exists.' : 'Select a contractor hourly rate.');

  const profileDefaultHours = selectedProfile?.defaultEstimatedHours
    ?? (selectedProfile?.strategy === 'tiered' && selectedProfile.unit === 'hours' ? selectedProfile.includedUnits : undefined);
  const effectiveHours = finiteNonNegative(
    selection.estimatedHoursOverridden ? selection.estimatedHours : profileDefaultHours ?? labor.estimatedHours,
  );
  const workerQuantity = finiteNonNegative(selection.quantity, 0);
  const workingDays = finiteNonNegative(selection.workingDays, 1) || 1;
  const employeeHours = workerQuantity * effectiveHours * workingDays;
  const scopeQuantity = finiteNonNegative(selection.additionalScopeQuantity ?? additionalCharge?.quantity, 0);
  const additionalScopeCharge = selectedProfile?.additionalCharges?.reduce(
    (sum, charge) => sum + finiteNonNegative(charge.rate) * finiteNonNegative(selection.additionalScopeQuantities?.[charge.id]), 0,
  ) ?? finiteNonNegative(additionalCharge?.rate) * scopeQuantity;

  let baseCharge = 0;
  let overageCharge = 0;
  if (selectedProfile) {
    const baseRate = finiteNonNegative(selectedProfile.baseRate);
    switch (selectedProfile.strategy) {
      case 'flat': baseCharge = baseRate; break;
      case 'hourly_passthrough': baseCharge = baseRate * effectiveHours; break;
      case 'tiered':
        if (selectedProfile.unit !== 'hours') errors.push('Only hours-based tiered client profiles are supported.');
        else {
          baseCharge = baseRate;
          overageCharge = Math.max(0, effectiveHours - finiteNonNegative(selectedProfile.includedUnits)) * finiteNonNegative(selectedProfile.overageRate);
        }
        break;
      default: errors.push('Legacy measured client profiles are unsupported in collection calculations.');
    }
  }
  const contractorCost = selectedContractorRate
    ? employeeHours * finiteNonNegative(selectedContractorRate.hourlyRate)
    : 0;
  return {
    effectiveHours, workingDays, employeeHours, selectedProfile, selectedContractorRate,
    baseCharge, overageCharge, additionalScopeCharge,
    clientTotal: baseCharge + overageCharge + additionalScopeCharge,
    contractorCost, errors,
  };
}
