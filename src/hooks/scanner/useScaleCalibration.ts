/**
 * useScaleCalibration - Hook for tape-measure calibration.
 * 
 * Calculates scale correction factor and accuracy from manual tape measurement.
 * 
 * CC = 2, Method length ≤ 30 lines.
 */

import { useMemo } from 'react';

export interface ScaleCalibrationState {
    correctionFactor: number;  // 1.0 = no correction
    accuracy: number;          // ±% error  
    isCalibrated: boolean;
}

/**
 * Calculate scale calibration from tape-measure input.
 * 
 * @param calculatedDistance - Distance from AR boundary (meters)
 * @param measuredDistance - Distance from tape measure (meters), null if not measured
 */
export function useScaleCalibration(
    calculatedDistance: number,
    measuredDistance: number | null
): ScaleCalibrationState {
    return useMemo(() => {
        // No measurement provided
        if (measuredDistance === null) {
            return { correctionFactor: 1.0, accuracy: 0, isCalibrated: false };
        }

        // Invalid calculated distance
        if (calculatedDistance <= 0) {
            return { correctionFactor: 1.0, accuracy: 0, isCalibrated: false };
        }

        const correctionFactor = measuredDistance / calculatedDistance;
        const accuracy = Math.abs(correctionFactor - 1) * 100;

        return {
            correctionFactor,
            accuracy,
            isCalibrated: true
        };
    }, [calculatedDistance, measuredDistance]);
}
