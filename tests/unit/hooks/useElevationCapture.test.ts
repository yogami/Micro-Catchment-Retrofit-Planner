/**
 * useElevationCapture - ATDD Spec (RED Phase)
 * 
 * Main hook for capturing elevation samples during AR scan.
 * Tests written FIRST per Gold Standard ATDD protocol.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useElevationCapture } from '../../../src/hooks/scanner/useElevationCapture';

describe('useElevationCapture', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        // Mock barometer as unavailable by default (GPS fallback)
        (globalThis as any).Barometer = undefined;
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('initialization', () => {
        it('starts with an empty grid', () => {
            const { result } = renderHook(() =>
                useElevationCapture({ x: 0, y: 0 }, false)
            );

            expect(result.current.grid.sampleCount).toBe(0);
        });

        it('is not capturing initially when inactive', () => {
            const { result } = renderHook(() =>
                useElevationCapture({ x: 0, y: 0 }, false)
            );

            expect(result.current.isCapturing).toBe(false);
        });

        it('reports sensor source', () => {
            const { result } = renderHook(() =>
                useElevationCapture({ x: 0, y: 0 }, false)
            );

            // Without barometer, should fallback to gps or unavailable
            expect(['gps', 'unavailable']).toContain(result.current.sensorSource);
        });
    });

    describe('capture behavior', () => {
        it('captures samples when active', () => {
            const { result, rerender } = renderHook(
                ({ pos, active }) => useElevationCapture(pos, active),
                { initialProps: { pos: { x: 0, y: 0 }, active: true } }
            );

            // Advance time for one sample
            act(() => {
                jest.advanceTimersByTime(250); // 200ms interval + buffer
            });

            expect(result.current.grid.sampleCount).toBeGreaterThanOrEqual(1);
        });

        it('pauses capture when inactive', () => {
            const { result, rerender } = renderHook(
                ({ pos, active }) => useElevationCapture(pos, active),
                { initialProps: { pos: { x: 0, y: 0 }, active: true } }
            );

            // Capture first sample
            act(() => {
                jest.advanceTimersByTime(250);
            });
            const countBefore = result.current.grid.sampleCount;

            // Deactivate
            rerender({ pos: { x: 1, y: 1 }, active: false });

            // Wait more time
            act(() => {
                jest.advanceTimersByTime(500);
            });

            // Count should not have increased
            expect(result.current.grid.sampleCount).toBe(countBefore);
        });

        it('samples at approximately 5Hz', () => {
            const { result } = renderHook(() =>
                useElevationCapture({ x: 0, y: 0 }, true)
            );

            // Run for 1 second
            act(() => {
                jest.advanceTimersByTime(1000);
            });

            // Should have ~5 samples (200ms intervals)
            expect(result.current.grid.sampleCount).toBeGreaterThanOrEqual(4);
            expect(result.current.grid.sampleCount).toBeLessThanOrEqual(6);
        });
    });

    describe('elevation normalization', () => {
        it('normalizes first sample to 0 elevation', () => {
            const { result } = renderHook(() =>
                useElevationCapture({ x: 0, y: 0 }, true)
            );

            act(() => {
                jest.advanceTimersByTime(250);
            });

            // First sample should be at elevation 0 (normalized)
            const elevation = result.current.grid.interpolate(0, 0);
            expect(elevation).toBeCloseTo(0, 1);
        });
    });

    describe('position tracking', () => {
        it('records position changes in samples', () => {
            const { result, rerender } = renderHook(
                ({ pos, active }) => useElevationCapture(pos, active),
                { initialProps: { pos: { x: 0, y: 0 }, active: true } }
            );

            act(() => {
                jest.advanceTimersByTime(250);
            });

            // Move position
            rerender({ pos: { x: 2, y: 3 }, active: true });

            act(() => {
                jest.advanceTimersByTime(250);
            });

            // Grid bounds should expand
            const bounds = result.current.grid.getBounds();
            expect(bounds).not.toBeNull();
            expect(bounds!.maxX).toBeGreaterThanOrEqual(2);
            expect(bounds!.maxY).toBeGreaterThanOrEqual(3);
        });
    });
});
