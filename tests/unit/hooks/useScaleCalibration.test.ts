/**
 * useScaleCalibration - ATDD Spec (RED Phase)
 * 
 * Hook for managing scale correction from tape-measure calibration.
 * Tests written FIRST per Gold Standard ATDD protocol.
 */
import { describe, it, expect } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useScaleCalibration } from '../../../src/hooks/scanner/useScaleCalibration';

describe('useScaleCalibration', () => {
    describe('default state', () => {
        it('returns correction factor of 1.0 when no measurement', () => {
            const { result } = renderHook(() =>
                useScaleCalibration(10.0, null)
            );

            expect(result.current.correctionFactor).toBe(1.0);
        });

        it('returns isCalibrated false when no measurement', () => {
            const { result } = renderHook(() =>
                useScaleCalibration(10.0, null)
            );

            expect(result.current.isCalibrated).toBe(false);
        });

        it('returns 0% accuracy when no measurement', () => {
            const { result } = renderHook(() =>
                useScaleCalibration(10.0, null)
            );

            expect(result.current.accuracy).toBe(0);
        });
    });

    describe('calibration calculations', () => {
        it('calculates correction factor when measured > calculated', () => {
            const { result } = renderHook(() =>
                useScaleCalibration(10.0, 10.3)
            );

            // Measured 10.3, calculated 10.0 → correction = 1.03
            expect(result.current.correctionFactor).toBeCloseTo(1.03, 2);
        });

        it('calculates correction factor when measured < calculated', () => {
            const { result } = renderHook(() =>
                useScaleCalibration(10.0, 9.7)
            );

            // Measured 9.7, calculated 10.0 → correction = 0.97
            expect(result.current.correctionFactor).toBeCloseTo(0.97, 2);
        });

        it('sets isCalibrated true when measurement provided', () => {
            const { result } = renderHook(() =>
                useScaleCalibration(10.0, 10.3)
            );

            expect(result.current.isCalibrated).toBe(true);
        });

        it('calculates accuracy as percentage difference', () => {
            const { result } = renderHook(() =>
                useScaleCalibration(10.0, 10.3)
            );

            // 3% difference
            expect(result.current.accuracy).toBeCloseTo(3, 0);
        });

        it('handles exact match with 0% error', () => {
            const { result } = renderHook(() =>
                useScaleCalibration(10.0, 10.0)
            );

            expect(result.current.correctionFactor).toBe(1.0);
            expect(result.current.accuracy).toBe(0);
            expect(result.current.isCalibrated).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('handles zero calculated distance gracefully', () => {
            const { result } = renderHook(() =>
                useScaleCalibration(0, 10.0)
            );

            expect(result.current.correctionFactor).toBe(1.0);
            expect(result.current.isCalibrated).toBe(false);
        });

        it('handles zero measured distance', () => {
            const { result } = renderHook(() =>
                useScaleCalibration(10.0, 0)
            );

            expect(result.current.correctionFactor).toBe(0);
            expect(result.current.accuracy).toBe(100);
        });
    });
});
