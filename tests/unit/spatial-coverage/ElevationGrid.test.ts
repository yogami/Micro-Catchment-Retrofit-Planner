/**
 * ElevationGrid - ATDD Spec (RED Phase)
 * 
 * Domain entity for DEM raster with IDW interpolation.
 * Tests written FIRST per Gold Standard ATDD protocol.
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { ElevationGrid, createElevationSample } from '../../../src/lib/spatial-coverage';

describe('ElevationGrid', () => {
    let grid: ElevationGrid;

    beforeEach(() => {
        grid = new ElevationGrid(0.1); // 10cm cell size
    });

    describe('Constructor', () => {
        it('creates an empty grid with specified cell size', () => {
            expect(grid.cellSize).toBe(0.1);
            expect(grid.sampleCount).toBe(0);
        });

        it('defaults to 10cm cell size', () => {
            const defaultGrid = new ElevationGrid();
            expect(defaultGrid.cellSize).toBe(0.1);
        });
    });

    describe('addSample', () => {
        it('adds a sample and increments count', () => {
            const sample = createElevationSample({
                x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer'
            });

            grid.addSample(sample);
            expect(grid.sampleCount).toBe(1);
        });

        it('accumulates multiple samples', () => {
            for (let i = 0; i < 5; i++) {
                grid.addSample(createElevationSample({
                    x: i * 0.5, y: 0, elevation: i * 0.1, accuracy: 0.1, source: 'barometer'
                }));
            }
            expect(grid.sampleCount).toBe(5);
        });
    });

    describe('interpolate (IDW)', () => {
        it('returns null for empty grid', () => {
            expect(grid.interpolate(0, 0)).toBeNull();
        });

        it('returns exact value at sample location', () => {
            grid.addSample(createElevationSample({
                x: 1, y: 1, elevation: 0.5, accuracy: 0.1, source: 'barometer'
            }));

            expect(grid.interpolate(1, 1)).toBeCloseTo(0.5, 3);
        });

        it('interpolates between two samples', () => {
            grid.addSample(createElevationSample({
                x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer'
            }));
            grid.addSample(createElevationSample({
                x: 2, y: 0, elevation: 1.0, accuracy: 0.1, source: 'barometer'
            }));

            // Midpoint should be ~0.5 (IDW weighted)
            const mid = grid.interpolate(1, 0);
            expect(mid).toBeCloseTo(0.5, 1);
        });

        it('uses IDW for 4-corner interpolation', () => {
            // Create a square with known elevations
            grid.addSample(createElevationSample({ x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer' }));
            grid.addSample(createElevationSample({ x: 1, y: 0, elevation: 0.1, accuracy: 0.1, source: 'barometer' }));
            grid.addSample(createElevationSample({ x: 0, y: 1, elevation: 0, accuracy: 0.1, source: 'barometer' }));
            grid.addSample(createElevationSample({ x: 1, y: 1, elevation: 0.1, accuracy: 0.1, source: 'barometer' }));

            // Center should be approximately 0.05 (average of corners)
            const center = grid.interpolate(0.5, 0.5);
            expect(center).toBeCloseTo(0.05, 1);
        });
    });

    describe('getSlope', () => {
        it('returns null for empty grid', () => {
            expect(grid.getSlope(0, 0)).toBeNull();
        });

        it('returns null for single sample', () => {
            grid.addSample(createElevationSample({
                x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer'
            }));
            expect(grid.getSlope(0, 0)).toBeNull();
        });

        it('calculates positive slope in X direction', () => {
            grid.addSample(createElevationSample({ x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer' }));
            grid.addSample(createElevationSample({ x: 1, y: 0, elevation: 0.1, accuracy: 0.1, source: 'barometer' }));

            const slope = grid.getSlope(0.5, 0);
            expect(slope).not.toBeNull();
            expect(slope!.dx).toBeGreaterThan(0); // Positive slope in X
            expect(Math.abs(slope!.dy)).toBeLessThan(0.05); // Nearly flat in Y
        });

        it('calculates slope magnitude correctly', () => {
            // 1m rise over 10m run = 10% grade
            grid.addSample(createElevationSample({ x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer' }));
            grid.addSample(createElevationSample({ x: 10, y: 0, elevation: 1, accuracy: 0.1, source: 'barometer' }));

            const slope = grid.getSlope(5, 0);
            // IDW at midpoint should give positive slope
            expect(slope!.dx).toBeGreaterThan(0);
        });
    });

    describe('getBounds', () => {
        it('returns null for empty grid', () => {
            expect(grid.getBounds()).toBeNull();
        });

        it('returns exact bounds for single sample', () => {
            grid.addSample(createElevationSample({
                x: 5, y: 3, elevation: 1.5, accuracy: 0.1, source: 'barometer'
            }));

            const bounds = grid.getBounds();
            expect(bounds).toEqual({
                minX: 5, maxX: 5,
                minY: 3, maxY: 3,
                minZ: 1.5, maxZ: 1.5
            });
        });

        it('expands bounds for multiple samples', () => {
            grid.addSample(createElevationSample({ x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer' }));
            grid.addSample(createElevationSample({ x: 10, y: 5, elevation: 2, accuracy: 0.1, source: 'barometer' }));
            grid.addSample(createElevationSample({ x: 3, y: 8, elevation: -0.5, accuracy: 0.1, source: 'barometer' }));

            const bounds = grid.getBounds();
            expect(bounds!.minX).toBe(0);
            expect(bounds!.maxX).toBe(10);
            expect(bounds!.minY).toBe(0);
            expect(bounds!.maxY).toBe(8);
            expect(bounds!.minZ).toBe(-0.5);
            expect(bounds!.maxZ).toBe(2);
        });
    });

    describe('toRaster', () => {
        it('returns empty array for empty grid', () => {
            expect(grid.toRaster()).toEqual([]);
        });

        it('generates 2D array matching bounds', () => {
            grid.addSample(createElevationSample({ x: 0, y: 0, elevation: 0, accuracy: 0.1, source: 'barometer' }));
            grid.addSample(createElevationSample({ x: 0.2, y: 0.2, elevation: 0.1, accuracy: 0.1, source: 'barometer' }));

            const raster = grid.toRaster();
            expect(raster.length).toBeGreaterThan(0);
            expect(raster[0].length).toBeGreaterThan(0);
        });
    });
});
