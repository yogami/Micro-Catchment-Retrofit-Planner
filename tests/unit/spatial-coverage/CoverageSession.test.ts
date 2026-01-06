/**
 * Unit tests for CoverageSession aggregate
 * ATDD: Test-first approach for spatial-coverage microservice
 */
import { CoverageSession, Boundary } from '../../../src/lib/spatial-coverage';

describe('CoverageSession', () => {
    describe('constructor', () => {
        it('creates session with default 5cm voxel size', () => {
            const session = new CoverageSession('test-1');
            expect(session.id).toBe('test-1');
            expect(session.voxelSize).toBe(0.05);
            expect(session.boundary).toBeNull();
        });

        it('accepts custom voxel size', () => {
            const session = new CoverageSession('test-2', 0.1);
            expect(session.voxelSize).toBe(0.1);
        });
    });

    describe('paint', () => {
        it('marks new voxel as covered', () => {
            const session = new CoverageSession('test');
            const result = session.paint(0.12, 0.08);

            expect(result.isNew).toBe(true);
            expect(result.voxel.gridX).toBe(2); // 0.12 / 0.05 = 2.4 → 2
            expect(result.voxel.gridY).toBe(1); // 0.08 / 0.05 = 1.6 → 1
            expect(result.isInsideBoundary).toBe(true);
        });

        it('returns isNew=false for already covered voxel', () => {
            const session = new CoverageSession('test');
            session.paint(0.12, 0.08);
            const result = session.paint(0.13, 0.09); // Same voxel

            expect(result.isNew).toBe(false);
        });

        it('detects when point is outside boundary', () => {
            const session = new CoverageSession('test');
            session.setBoundary(Boundary.fromRectangle(
                { x: 0, y: 0 },
                { x: 1, y: 1 }
            ));

            const inside = session.paint(0.5, 0.5);
            const outside = session.paint(2, 2);

            expect(inside.isInsideBoundary).toBe(true);
            expect(outside.isInsideBoundary).toBe(false);
        });
    });

    describe('Boundary utility', () => {
        it('clears boundary', () => {
            const session = new CoverageSession('test');
            session.setBoundary(new Boundary([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]));
            expect(session.boundary).not.toBeNull();
            session.clearBoundary();
            expect(session.boundary).toBeNull();
        });

        it('checks isInsideBoundary correctly', () => {
            const session = new CoverageSession('test');
            // No boundary -> always true
            expect(session.isInsideBoundary(100, 100)).toBe(true);

            session.setBoundary(new Boundary([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }]));
            expect(session.isInsideBoundary(0.2, 0.2)).toBe(true);
            expect(session.isInsideBoundary(2, 2)).toBe(false);
        });
    });

    describe('Get Area', () => {
        it('calculates covered area', () => {
            const session = new CoverageSession('test', 1.0); // 1x1m voxels
            session.paint(0, 0);
            session.paint(10, 10);
            expect(session.getVoxelCount()).toBe(2);
            expect(session.getArea()).toBeCloseTo(2.0); // 2 * 1*1
        });
    });

    describe('getStats', () => {
        it('returns correct coverage stats', () => {
            const session = new CoverageSession('test', 0.05);

            // Paint 4 voxels (0.0025m² each = 0.01m² total)
            session.paint(0, 0);
            session.paint(0.05, 0);
            session.paint(0, 0.05);
            session.paint(0.05, 0.05);

            const stats = session.getStats();
            expect(stats.voxelCount).toBe(4);
            expect(stats.coveredAreaM2).toBeCloseTo(0.01);
            expect(stats.coveragePercent).toBeNull(); // No boundary
            expect(stats.isComplete).toBe(false);
        });

        it('calculates coverage % when boundary is set', () => {
            const session = new CoverageSession('test', 1); // 1m grid for easy math
            session.setBoundary(Boundary.fromRectangle(
                { x: 0, y: 0 },
                { x: 10, y: 10 } // 100m² boundary
            ));

            // Paint 50 voxels = 50m² = 50% coverage
            for (let x = 0; x < 10; x++) {
                for (let y = 0; y < 5; y++) {
                    session.paint(x + 0.5, y + 0.5);
                }
            }

            const stats = session.getStats();
            expect(stats.coveragePercent).toBeCloseTo(50, 0);
            expect(stats.expectedAreaM2).toBeCloseTo(100);
            expect(stats.isComplete).toBe(false);
        });

        it('isComplete is true at 98% coverage', () => {
            const session = new CoverageSession('test', 1);
            session.setBoundary(Boundary.fromRectangle(
                { x: 0, y: 0 },
                { x: 10, y: 10 }
            ));

            // Paint 98 voxels = 98m² = 98% coverage
            for (let x = 0; x < 10; x++) {
                for (let y = 0; y < 10; y++) {
                    if (x === 9 && y >= 8) continue; // Skip 2 voxels
                    session.paint(x + 0.5, y + 0.5);
                }
            }

            const stats = session.getStats();
            expect(stats.coveragePercent).toBeCloseTo(98, 0);
            expect(stats.isComplete).toBe(true);
        });
    });

    describe('getVoxels', () => {
        it('returns all covered voxels', () => {
            const session = new CoverageSession('test');
            session.paint(0, 0);
            session.paint(0.1, 0);
            session.paint(0.2, 0);

            const voxels = session.getVoxels();
            expect(voxels).toHaveLength(3);
        });
    });

    describe('reset', () => {
        it('clears voxels but keeps boundary', () => {
            const session = new CoverageSession('test');
            session.setBoundary(Boundary.fromRectangle(
                { x: 0, y: 0 },
                { x: 10, y: 10 }
            ));
            session.paint(0, 0);
            session.paint(1, 1);

            session.reset();

            expect(session.getVoxelCount()).toBe(0);
            expect(session.boundary).not.toBeNull();
        });
    });

    describe('fullReset', () => {
        it('clears both voxels and boundary', () => {
            const session = new CoverageSession('test');
            session.setBoundary(Boundary.fromRectangle(
                { x: 0, y: 0 },
                { x: 10, y: 10 }
            ));
            session.paint(0, 0);

            session.fullReset();

            expect(session.getVoxelCount()).toBe(0);
            expect(session.boundary).toBeNull();
        });
    });
});
