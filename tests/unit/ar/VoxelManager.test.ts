/**
 * VoxelManager Tests - Acceptance Tests for Survey-Grade AR Mapping
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { VoxelManager } from '../../../src/utils/ar/VoxelManager';

describe('VoxelManager', () => {
    let manager: VoxelManager;

    beforeEach(() => {
        manager = new VoxelManager(0.05); // 5cm grid (new default)
    });

    describe('AC1: Never Double-Count', () => {
        it('returns true for new voxel', () => {
            expect(manager.paint(1.0, 1.0)).toBe(true);
        });

        it('returns false for same coordinate painted twice', () => {
            manager.paint(1.0, 1.0);
            expect(manager.paint(1.0, 1.0)).toBe(false);
        });

        it('returns false for coordinates in same voxel', () => {
            manager.paint(1.05, 1.05);
            expect(manager.paint(1.09, 1.09)).toBe(false);
        });

        it('returns true for different voxels', () => {
            manager.paint(1.0, 1.0);
            expect(manager.paint(1.2, 1.0)).toBe(true);
        });
    });

    describe('AC2: Accurate Area Calculation', () => {
        it('calculates area correctly for single voxel', () => {
            manager.paint(0, 0);
            expect(manager.getArea()).toBeCloseTo(0.0025, 4); // 0.05m * 0.05m = 0.0025m²
        });

        it('calculates area correctly for 400 voxels (1m²)', () => {
            // 5cm grid: 20x20 = 400 voxels for 1m²
            for (let x = 0; x < 20; x++) {
                for (let y = 0; y < 20; y++) {
                    manager.paint(x * 0.05, y * 0.05);
                }
            }
            expect(manager.getArea()).toBeCloseTo(1.0, 2);
        });

        it('counts voxels correctly', () => {
            manager.paint(0, 0);
            manager.paint(0.1, 0);
            manager.paint(0.2, 0);
            expect(manager.getVoxelCount()).toBe(3);
        });
    });

    describe('AC3: Zero Area on Re-Sweep', () => {
        it('re-sweeping same area adds zero area', () => {
            // First sweep: paint 100 voxels
            for (let i = 0; i < 100; i++) {
                manager.paint(i * 0.1, 0);
            }
            const areaAfterFirstSweep = manager.getArea();

            // Second sweep: paint same 100 voxels
            for (let i = 0; i < 100; i++) {
                manager.paint(i * 0.1, 0);
            }
            const areaAfterSecondSweep = manager.getArea();

            expect(areaAfterSecondSweep).toBe(areaAfterFirstSweep);
        });
    });

    describe('reset', () => {
        it('clears all voxels', () => {
            manager.paint(0, 0);
            manager.paint(1, 1);
            manager.reset();
            expect(manager.getVoxelCount()).toBe(0);
            expect(manager.getArea()).toBe(0);
        });

        it('allows re-painting after reset', () => {
            manager.paint(0, 0);
            manager.reset();
            expect(manager.paint(0, 0)).toBe(true);
        });
    });

    describe('custom voxel size', () => {
        it('works with 1m grid', () => {
            const bigManager = new VoxelManager(1.0);
            bigManager.paint(0, 0);
            expect(bigManager.getArea()).toBe(1.0);
        });

        it('works with 5cm grid', () => {
            const smallManager = new VoxelManager(0.05);
            smallManager.paint(0, 0);
            expect(smallManager.getArea()).toBeCloseTo(0.0025, 4);
        });
    });

    describe('coverage and export', () => {
        it('calculates coverage percentage correctly', () => {
            const m = new VoxelManager(0.05);
            // Paint voxels covering 0.5m² area
            for (let x = 0; x < 10; x++) {
                for (let y = 0; y < 20; y++) {
                    m.paint(x * 0.05, y * 0.05);
                }
            }
            // 200 voxels = 0.5m² out of expected 1m² = 50%
            expect(m.getCoveragePercent(1.0)).toBeCloseTo(50, -1);
        });

        it('returns 0% coverage for zero expected area', () => {
            expect(manager.getCoveragePercent(0)).toBe(0);
        });

        it('caps coverage at 100%', () => {
            const m = new VoxelManager(0.05);
            for (let i = 0; i < 500; i++) {
                m.paint(i * 0.05, 0);
            }
            // More than expected
            expect(m.getCoveragePercent(1.0)).toBe(100);
        });

        it('exports voxel keys', () => {
            manager.paint(0, 0);
            manager.paint(0.05, 0);
            const keys = manager.getVoxelKeys();
            expect(keys.length).toBe(2);
            expect(keys).toContain('0,0');
        });

        it('returns voxel size', () => {
            expect(manager.getVoxelSize()).toBe(0.05);
        });
    });
});
