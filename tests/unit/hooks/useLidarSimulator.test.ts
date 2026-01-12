/**
 * useLidarSimulator - ATDD Spec (RED Phase)
 * 
 * Simulates high-precision LiDAR hits for hardware-less development.
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useLidarSimulator } from '../../../src/hooks/scanner/useLidarSimulator';
import { ElevationGrid } from '../../../src/lib/spatial-coverage';

describe('useLidarSimulator', () => {
    let grid: ElevationGrid;

    beforeEach(() => {
        grid = new ElevationGrid();
        jest.useFakeTimers();
    });

    it('does not add samples when inactive', () => {
        renderHook(() => useLidarSimulator(grid, { x: 0, y: 0 }, false));

        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(grid.sampleCount).toBe(0);
    });

    it('adds precise lidar samples when active', () => {
        renderHook(() => useLidarSimulator(grid, { x: 1, y: 1 }, true));

        act(() => {
            jest.advanceTimersByTime(2000); // Wait for multiple intervals
        });

        expect(grid.sampleCount).toBeGreaterThan(0);

        const bounds = grid.getBounds();
        expect(bounds).not.toBeNull();
        // With ±0.1 jitter, x=1 should be within 0.9 - 1.1
        expect(bounds!.minX).toBeGreaterThan(0.5);
        expect(bounds!.maxX).toBeLessThan(1.5);
    });

    it('simulates a range of elevation values (micro-topography)', () => {
        renderHook(() => useLidarSimulator(grid, { x: 0, y: 0 }, true));

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        const bounds = grid.getBounds();
        // Should have captured some elevation variation
        expect(bounds!.maxZ - bounds!.minZ).toBeGreaterThan(0);
    });
});
