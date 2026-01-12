/**
 * useCoverageValidation - Hook for automated validation checks.
 * 
 * Validates coverage completeness and calibration status.
 * Returns overall pass/warning/fail status.
 * 
 * CC = 3, Method length ≤ 30 lines.
 */

import { useMemo } from 'react';
import type { ScaleCalibrationState } from './useScaleCalibration';

const COVERAGE_THRESHOLD = 95; // >95% required for pass

export type ValidationStatus = 'pass' | 'warning' | 'fail';

export interface ValidationResult {
    isCoverageComplete: boolean;  // >95% voxels filled
    coveragePercent: number;
    isCalibrated: boolean;
    overallStatus: ValidationStatus;
}

/**
 * Validate scan coverage and calibration status.
 * 
 * @param coveragePercent - Current coverage percentage
 * @param calibration - Scale calibration state
 */
export function useCoverageValidation(
    coveragePercent: number,
    calibration: ScaleCalibrationState
): ValidationResult {
    return useMemo(() => {
        const safePercent = coveragePercent ?? 0;
        const isCoverageComplete = safePercent > COVERAGE_THRESHOLD;
        const isCalibrated = calibration.isCalibrated;

        let overallStatus: ValidationStatus;
        if (!isCoverageComplete) {
            overallStatus = 'fail';
        } else if (!isCalibrated) {
            overallStatus = 'warning';
        } else {
            overallStatus = 'pass';
        }

        return {
            isCoverageComplete,
            coveragePercent: safePercent,
            isCalibrated,
            overallStatus
        };
    }, [coveragePercent, calibration.isCalibrated]);
}
