/**
 * Unit tests for Voxel value object
 * ATDD: Test-first approach for spatial-coverage microservice
 */
import { Voxel } from '../../../src/lib/spatial-coverage';

describe('Voxel', () => {
    describe('constructor', () => {
        it('creates an immutable voxel with grid coordinates', () => {
            const voxel = new Voxel(10, 20, 0.05);

            expect(voxel.gridX).toBe(10);
            expect(voxel.gridY).toBe(20);
            expect(voxel.voxelSize).toBe(0.05);
            expect(Object.isFrozen(voxel)).toBe(true);
        });
    });

    describe('key', () => {
        it('generates unique string key for grid position', () => {
            const voxel = new Voxel(10, 20, 0.05);
            expect(voxel.key).toBe('10,20');
        });

        it('handles negative coordinates', () => {
            const voxel = new Voxel(-5, -10, 0.05);
            expect(voxel.key).toBe('-5,-10');
        });
    });

    describe('worldX/worldY', () => {
        it('returns center of voxel in world coordinates', () => {
            const voxel = new Voxel(10, 20, 0.1);

            // Center of voxel at grid (10, 20) with size 0.1m
            // = (10 + 0.5) * 0.1 = 1.05m
            expect(voxel.worldX).toBeCloseTo(1.05);
            expect(voxel.worldY).toBeCloseTo(2.05);
        });
    });

    describe('area', () => {
        it('calculates area in square meters', () => {
            const voxel5cm = new Voxel(0, 0, 0.05);
            expect(voxel5cm.area).toBeCloseTo(0.0025); // 5cm × 5cm = 0.0025m²

            const voxel10cm = new Voxel(0, 0, 0.1);
            expect(voxel10cm.area).toBeCloseTo(0.01); // 10cm × 10cm = 0.01m²
        });
    });

    describe('fromWorld', () => {
        it('creates voxel from world coordinates', () => {
            const voxel = Voxel.fromWorld(0.52, 0.13, 0.05);

            // 0.52 / 0.05 = 10.4 → floor = 10
            // 0.13 / 0.05 = 2.6 → floor = 2
            expect(voxel.gridX).toBe(10);
            expect(voxel.gridY).toBe(2);
        });

        it('handles origin correctly', () => {
            const voxel = Voxel.fromWorld(0, 0, 0.05);
            expect(voxel.gridX).toBe(0);
            expect(voxel.gridY).toBe(0);
        });

        it('handles negative coordinates', () => {
            const voxel = Voxel.fromWorld(-0.12, -0.24, 0.05);
            expect(voxel.gridX).toBe(-3); // -0.12 / 0.05 = -2.4 → floor = -3
            expect(voxel.gridY).toBe(-5); // -0.24 / 0.05 = -4.8 → floor = -5
        });
    });

    describe('equals', () => {
        it('returns true for identical voxels', () => {
            const v1 = new Voxel(10, 20, 0.05);
            const v2 = new Voxel(10, 20, 0.05);
            expect(v1.equals(v2)).toBe(true);
        });

        it('returns false for different positions', () => {
            const v1 = new Voxel(10, 20, 0.05);
            const v2 = new Voxel(10, 21, 0.05);
            expect(v1.equals(v2)).toBe(false);
        });

        it('returns false for different voxel sizes', () => {
            const v1 = new Voxel(10, 20, 0.05);
            const v2 = new Voxel(10, 20, 0.1);
            expect(v1.equals(v2)).toBe(false);
        });
    });
});
