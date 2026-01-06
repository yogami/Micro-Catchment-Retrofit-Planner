import { useEffect } from 'react';
import { calculateTotalReduction } from '../../utils/hydrology';
import type { ARScannerState, UpdateFn, Services } from '../useARScanner';
import type { BMPSpec } from '../../lib/env-calculator';
import type { ComplianceResult } from '../../lib/grant-generator';

/**
 * useScannerCompliance - Hook to handle regulatory compliance checks and pollutant reduction analysis.
 */
export function useScannerCompliance(state: ARScannerState, services: Services, update: UpdateFn) {
    useEffect(() => {
        if (!state.detectedArea) return;

        const timer = setTimeout(() => {
            const bmps: BMPSpec[] = state.fixes.map((f) => ({
                type: f.type as any,
                area_m2: f.size
            }));

            const pollutantResult = services.pollutant.calculateWithBMPs({
                area_m2: state.detectedArea!,
                imperviousPercent: 100,
                annualRainfall_mm: 1000,
                bmps: bmps
            });

            const grants = getGrants(state.activeProfile.jurisdictionCode);
            console.log('[DEBUG] Compliance for code:', state.activeProfile.jurisdictionCode, 'Grants:', grants);
            const complianceResults = grants.map(gid => services.pdf.complianceService.checkCompliance({
                jurisdictionCode: state.activeProfile.jurisdictionCode,
                jurisdictionChain: state.jurisdictionChain?.hierarchy.map(j => j.name) || [],
                area_m2: state.detectedArea!,
                retention_in: state.manualDepth / 25.4,
                peakReduction_percent: calculateTotalReduction(state.fixes, state.detectedArea!),
                hasBCR: true,
                bcrValue: 1.8,
                hasResiliencePlan: true,
                bmps: bmps,
                phosphorusRemoval_lb_yr: pollutantResult.phosphorus_lb_yr
            }, gid));

            update({
                pollutantResult,
                complianceResults: complianceResults as ComplianceResult[]
            });
        }, 50);

        return () => clearTimeout(timer);
    }, [
        state.detectedArea,
        state.fixes,
        state.activeProfile,
        state.manualDepth,
        state.jurisdictionChain,
        update,
        services
    ]);
}

/**
 * Determine eligible grants based on jurisdiction code
 */
function getGrants(code: string): Array<'CFPF' | 'SLAF' | 'BRIC' | 'BENE2'> {
    const grants: Array<'CFPF' | 'SLAF' | 'BRIC' | 'BENE2'> = ['CFPF', 'SLAF', 'BRIC'];
    if (code.startsWith('DE-BE')) grants.push('BENE2');
    return grants;
}
