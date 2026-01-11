import { describe, it, expect } from '@jest/globals';
import { BoundsCalculator, MapViewport, ScreenToWorld } from '../../../../src/components/scanner/coverage/ui/MapViewport';

describe('ScreenToWorld', () => {
    it('maps bottom-center of screen to world origin (0,0)', () => {
        const width = 400;
        const height = 800;
        const screenPoint = { x: 200, y: 800 }; // Bottom center

        const worldPoint = ScreenToWorld.map(screenPoint, width, height);

        expect(worldPoint.x).toBe(0);
        expect(worldPoint.y).toBe(0);
    });

    it('maps top-right of screen to expected world meters', () => {
        const width = 400;
        const height = 800;
        const screenPoint = { x: 400, y: 0 }; // Top right

        const worldPoint = ScreenToWorld.map(screenPoint, width, height);

        // (400 - 200) * 0.01 = 2
        expect(worldPoint.x).toBe(2);
        // (800 - 0) * 0.01 = 8
        expect(worldPoint.y).toBe(8);
    });
});

describe('BoundsCalculator', () => {
    it('calculates bounds centered on camera when no voxels exist', () => {
        const cam = { x: 5, y: 5 };
        const bounds = BoundsCalculator.calculate(cam, []);

        // cam window is 4x4 (5-1 to 5+1 initially, then padding 0.5 each side)
        // so minX = 4 - 0.5 = 3.5, maxX = 6 + 0.5 = 6.5
        expect(bounds.minX).toBe(3.5);
        expect(bounds.maxX).toBe(6.5);
    });

    it('expands bounds to include voxels', () => {
        const cam = { x: 0, y: 0 };
        const voxels = [{ worldX: 10, worldY: 10, voxelSize: 0.1 }];
        const bounds = BoundsCalculator.calculate(cam, voxels);

        expect(bounds.minX).toBeLessThanOrEqual(-0.5);
        expect(bounds.maxX).toBeGreaterThanOrEqual(10.5);
    });
});

describe('MapViewport', () => {
    it('projects world coordinates to screen correctly', () => {
        const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
        const size = 100;
        const vp = new MapViewport(bounds, size);

        expect(vp.scale).toBe(10); // 100 / 10
        const screenP = vp.project(5, 5);
        expect(screenP.x).toBe(50);
        expect(screenP.y).toBe(50);
    });

    it('projects world size to screen pixels correctly', () => {
        const bounds = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
        const size = 100;
        const vp = new MapViewport(bounds, size);

        expect(vp.projectSize(0.5)).toBe(5);
    });
});
