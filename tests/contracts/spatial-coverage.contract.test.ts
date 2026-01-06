/**
 * Contract Tests: spatial-coverage
 * 
 * These tests validate the public API surface of the spatial-coverage microservice.
 * They act as a safety net during refactoring - if these fail, the public contract has changed.
 */
import {
    createCoverageService,
    Voxel,
    Boundary,
    CoverageSession,
    CoverageAnalyzer,
    createCoverageStats,
    type CoverageStats,
    type PaintResult,
    type GapInfo,
    type Point,
    type CoverageSessionPort,
    DEFAULT_VOXEL_SIZE,
    AUTO_COMPLETE_THRESHOLD,
    MIN_BOUNDARY_POINTS
} from '../../src/lib/spatial-coverage';

describe('spatial-coverage Contract Tests', () => {
    describe('Factory Function', () => {
        it('createCoverageService returns a valid CoverageSessionPort', () => {
            const service = createCoverageService();

            // Validate the interface
            expect(service).toBeDefined();
            expect(typeof service.createSession).toBe('function');
            expect(typeof service.paint).toBe('function');
            expect(typeof service.getStats).toBe('function');
            expect(typeof service.getVoxels).toBe('function');
            expect(typeof service.reset).toBe('function');
        });

        it('createCoverageService accepts custom voxel size', () => {
            const service = createCoverageService(0.1); // 10cm grid
            const stats = service.getStats();
            expect(stats).toBeDefined();
        });
    });

    describe('Voxel Value Object', () => {
        it('exports Voxel class with expected interface', () => {
            const voxel = Voxel.fromWorld(1.5, 2.5, 0.05);

            expect(voxel).toBeInstanceOf(Voxel);
            expect(typeof voxel.key).toBe('string');
            expect(typeof voxel.gridX).toBe('number');
            expect(typeof voxel.gridY).toBe('number');
            expect(typeof voxel.worldX).toBe('number');
            expect(typeof voxel.worldY).toBe('number');
            expect(typeof voxel.area).toBe('number');
        });

        it('Voxel.fromWorld creates from world coordinates', () => {
            const voxel = Voxel.fromWorld(1.5, 2.5, 0.05);
            expect(voxel.gridX).toBeDefined();
            expect(voxel.gridY).toBeDefined();
        });

        it('Voxel constructor works with grid coordinates', () => {
            const voxel = new Voxel(10, 20, 0.05);
            expect(voxel.gridX).toBe(10);
            expect(voxel.gridY).toBe(20);
            expect(voxel.key).toBe('10,20');
        });
    });

    describe('Boundary Value Object', () => {
        it('exports Boundary class with expected interface', () => {
            const points: Point[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
                { x: 0, y: 1 }
            ];
            const boundary = new Boundary(points);

            expect(boundary).toBeInstanceOf(Boundary);
            expect(typeof boundary.contains).toBe('function');
            expect(typeof boundary.area).toBe('number');
            expect(typeof boundary.minX).toBe('number');
            expect(typeof boundary.maxX).toBe('number');
        });

        it('Boundary.contains validates point containment', () => {
            const boundary = new Boundary([
                { x: 0, y: 0 },
                { x: 2, y: 0 },
                { x: 2, y: 2 },
                { x: 0, y: 2 }
            ]);

            expect(boundary.contains(1, 1)).toBe(true);
            expect(boundary.contains(5, 5)).toBe(false);
        });

        it('Boundary.fromRectangle creates from corners', () => {
            const boundary = Boundary.fromRectangle(
                { x: 0, y: 0 },
                { x: 2, y: 2 }
            );
            expect(boundary.area).toBeCloseTo(4);
        });
    });

    describe('CoverageSession Entity', () => {
        it('exports CoverageSession with expected interface', () => {
            const session = new CoverageSession('test-session', 0.05);

            expect(session).toBeInstanceOf(CoverageSession);
            expect(typeof session.paint).toBe('function');
            expect(typeof session.getStats).toBe('function');
            expect(typeof session.getVoxels).toBe('function');
            expect(typeof session.reset).toBe('function');
            expect(session.id).toBe('test-session');
        });

        it('paint returns PaintResult structure', () => {
            const session = new CoverageSession('test', 0.05);
            const result = session.paint(1.5, 2.5);

            expect(result).toBeDefined();
            expect(typeof result.isNew).toBe('boolean');
            expect(result.voxel).toBeInstanceOf(Voxel);
            expect(typeof result.isInsideBoundary).toBe('boolean');
        });
    });

    describe('CoverageAnalyzer Service', () => {
        it('exports CoverageAnalyzer with static methods', () => {
            expect(CoverageAnalyzer).toBeDefined();
            expect(typeof CoverageAnalyzer.findGaps).toBe('function');
            expect(typeof CoverageAnalyzer.findNearestGap).toBe('function');
            expect(typeof CoverageAnalyzer.expectedVoxelCount).toBe('function');
        });
    });

    describe('Configuration Constants', () => {
        it('exports expected configuration values', () => {
            expect(typeof DEFAULT_VOXEL_SIZE).toBe('number');
            expect(typeof AUTO_COMPLETE_THRESHOLD).toBe('number');
            expect(typeof MIN_BOUNDARY_POINTS).toBe('number');

            // Validate sensible defaults
            expect(DEFAULT_VOXEL_SIZE).toBeGreaterThan(0);
            expect(DEFAULT_VOXEL_SIZE).toBeLessThan(1); // Should be sub-meter
            expect(AUTO_COMPLETE_THRESHOLD).toBeGreaterThanOrEqual(0);
            expect(AUTO_COMPLETE_THRESHOLD).toBeLessThanOrEqual(100);
        });
    });

    describe('CoverageStats Structure', () => {
        it('getStats returns expected structure', () => {
            const service = createCoverageService(0.05);
            service.paint(1.0, 1.0);
            service.paint(1.1, 1.0);

            const stats = service.getStats();

            expect(stats).toBeDefined();
            expect(typeof stats!.coveredAreaM2).toBe('number');
            expect(typeof stats!.voxelCount).toBe('number');
            expect(typeof stats!.isComplete).toBe('boolean');
        });

        it('createCoverageStats factory works', () => {
            const stats = createCoverageStats({
                voxelCount: 100,
                voxelSize: 0.05,
                boundaryArea: 0.5
            });

            expect(stats.coveredAreaM2).toBeCloseTo(0.25); // 100 * 0.05^2
            expect(stats.voxelCount).toBe(100);
        });
    });
});
