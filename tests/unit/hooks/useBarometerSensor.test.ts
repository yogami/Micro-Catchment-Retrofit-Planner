/**
 * useBarometerSensor - ATDD Spec (RED Phase)
 * 
 * Hook for accessing Web Barometer API with ISA altitude conversion.
 * Tests written FIRST per Gold Standard ATDD protocol.
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useBarometerSensor } from '../../../src/hooks/scanner/useBarometerSensor';

describe('useBarometerSensor', () => {
    const originalBarometer = (globalThis as any).Barometer;

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        (globalThis as any).Barometer = originalBarometer;
    });

    describe('when Barometer API is not available', () => {
        beforeEach(() => {
            (globalThis as any).Barometer = undefined;
        });

        it('returns isAvailable: false', () => {
            const { result } = renderHook(() => useBarometerSensor());
            expect(result.current.isAvailable).toBe(false);
        });

        it('returns null for pressure and altitude', () => {
            const { result } = renderHook(() => useBarometerSensor());
            expect(result.current.pressure).toBeNull();
            expect(result.current.altitude).toBeNull();
        });
    });

    describe('when Barometer API is available', () => {
        let mockBarometer: any;
        let readingHandler: ((event: any) => void) | null = null;

        beforeEach(() => {
            mockBarometer = {
                start: jest.fn(),
                stop: jest.fn(),
                addEventListener: jest.fn((event: string, handler: (event: any) => void) => {
                    if (event === 'reading') readingHandler = handler;
                }),
                removeEventListener: jest.fn()
            };

            (globalThis as any).Barometer = jest.fn(() => mockBarometer);
        });

        it('returns isAvailable: true', () => {
            const { result } = renderHook(() => useBarometerSensor());
            expect(result.current.isAvailable).toBe(true);
        });

        it('starts the sensor on mount', () => {
            renderHook(() => useBarometerSensor());
            expect(mockBarometer.start).toHaveBeenCalled();
        });

        it('stops the sensor on unmount', () => {
            const { unmount } = renderHook(() => useBarometerSensor());
            unmount();
            expect(mockBarometer.stop).toHaveBeenCalled();
        });

        it('updates pressure on reading event', () => {
            const { result } = renderHook(() => useBarometerSensor());

            act(() => {
                if (readingHandler) {
                    readingHandler({ target: { pressure: 1013.25 } });
                }
            });

            expect(result.current.pressure).toBe(1013.25);
        });

        it('calculates altitude from pressure using ISA formula', () => {
            const { result } = renderHook(() => useBarometerSensor());

            act(() => {
                if (readingHandler) {
                    // Sea level pressure = 0m altitude
                    readingHandler({ target: { pressure: 1013.25 } });
                }
            });

            expect(result.current.altitude).toBeCloseTo(0, 0);
        });

        it('calculates correct altitude for pressure at ~100m', () => {
            const { result } = renderHook(() => useBarometerSensor());

            act(() => {
                if (readingHandler) {
                    // ~100m pressure drop (approx 12 hPa per 100m)
                    readingHandler({ target: { pressure: 1001.25 } });
                }
            });

            // Should be approximately 100m (ISA formula)
            expect(result.current.altitude).toBeGreaterThan(80);
            expect(result.current.altitude).toBeLessThan(120);
        });
    });
});
