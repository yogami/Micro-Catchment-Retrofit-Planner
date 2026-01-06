import { useEffect } from 'react';
import {
    computeRunoffWithPINN,
    computePeakRunoff,
    computeWQv,
    suggestGreenFixes
} from '../../utils/hydrology';
import type { ARScannerState, UpdateFn } from '../useARScanner';

/**
 * useScannerHydrology - Hook to handle hydrological calculations and green fix suggestions.
 * Debounced to prevent excessive CPU usage during active scanning.
 */
export function useScannerHydrology(state: ARScannerState, update: UpdateFn) {
    useEffect(() => {
        if (!state.detectedArea) return;

        const timer = setTimeout(() => {
            const currentIntensity = state.intensityMode === 'auto' ? state.rainfall : state.manualIntensity;

            const calcHydrology = async () => {
                let peakRunoff = 0;
                let isPinnActive = false;

                try {
                    peakRunoff = await computeRunoffWithPINN(currentIntensity, state.detectedArea!);
                    isPinnActive = true;
                } catch {
                    // Fallback to traditional Rational Method if PINN fails
                    const rv = state.activeProfile.parameters.rvFormula(100);
                    peakRunoff = computePeakRunoff(currentIntensity, state.detectedArea!, rv);
                }

                update({
                    peakRunoff,
                    isPinnActive,
                    wqv: computeWQv(state.manualDepth, state.detectedArea!, state.activeProfile.parameters.rvFormula(100)),
                    fixes: suggestGreenFixes(state.detectedArea!)
                });
            };

            calcHydrology();
        }, 250);

        return () => clearTimeout(timer);
    }, [
        state.detectedArea,
        state.rainfall,
        state.intensityMode,
        state.manualIntensity,
        state.manualDepth,
        state.activeProfile,
        update
    ]);
}
