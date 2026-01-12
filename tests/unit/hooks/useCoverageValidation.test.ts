/**
 * useCoverageValidation - ATDD Spec (RED Phase)
 * 
 * Hook for automated coverage and calibration validation.
 * Tests written FIRST per Gold Standard ATDD protocol.
 */
import { describe, it, expect } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useCoverageValidation } from '../../../src/hooks/scanner/useCoverageValidation';

describe('useCoverageValidation', () => {
    describe('coverage thresholds', () => {
        it('returns pass when coverage >95% and calibrated', () => {
            const { result } = renderHook(() =>
                useCoverageValidation(97, { correctionFactor: 1.0, accuracy: 2, isCalibrated: true })
            );

            expect(result.current.overallStatus).toBe('pass');
            expect(result.current.isCoverageComplete).toBe(true);
        });

        it('returns warning when coverage >95% but not calibrated', () => {
            const { result } = renderHook(() =>
                useCoverageValidation(97, { correctionFactor: 1.0, accuracy: 0, isCalibrated: false })
            );

            expect(result.current.overallStatus).toBe('warning');
            expect(result.current.isCoverageComplete).toBe(true);
        });

        it('returns fail when coverage <95%', () => {
            const { result } = renderHook(() =>
                useCoverageValidation(85, { correctionFactor: 1.0, accuracy: 2, isCalibrated: true })
            );

            expect(result.current.overallStatus).toBe('fail');
            expect(result.current.isCoverageComplete).toBe(false);
        });

        it('returns fail when coverage is exactly 95%', () => {
            const { result } = renderHook(() =>
                useCoverageValidation(95, { correctionFactor: 1.0, accuracy: 2, isCalibrated: true })
            );

            // 95% is the threshold, need >95% to pass
            expect(result.current.isCoverageComplete).toBe(false);
        });

        it('returns pass when coverage is 95.1%', () => {
            const { result } = renderHook(() =>
                useCoverageValidation(95.1, { correctionFactor: 1.0, accuracy: 2, isCalibrated: true })
            );

            expect(result.current.isCoverageComplete).toBe(true);
        });
    });

    describe('calibration status', () => {
        it('reflects isCalibrated from calibration state', () => {
            const { result } = renderHook(() =>
                useCoverageValidation(97, { correctionFactor: 1.03, accuracy: 3, isCalibrated: true })
            );

            expect(result.current.isCalibrated).toBe(true);
        });

        it('reflects not calibrated', () => {
            const { result } = renderHook(() =>
                useCoverageValidation(97, { correctionFactor: 1.0, accuracy: 0, isCalibrated: false })
            );

            expect(result.current.isCalibrated).toBe(false);
        });
    });

    describe('coverage percent passthrough', () => {
        it('returns the coverage percent', () => {
            const { result } = renderHook(() =>
                useCoverageValidation(87.5, { correctionFactor: 1.0, accuracy: 0, isCalibrated: false })
            );

            expect(result.current.coveragePercent).toBe(87.5);
        });
    });

    describe('null coverage handling', () => {
        it('returns fail for null coverage', () => {
            const { result } = renderHook(() =>
                useCoverageValidation(null as any, { correctionFactor: 1.0, accuracy: 0, isCalibrated: false })
            );

            expect(result.current.overallStatus).toBe('fail');
            expect(result.current.isCoverageComplete).toBe(false);
        });
    });
});
