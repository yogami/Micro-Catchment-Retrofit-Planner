import { CoverageAnalyzer } from '../../../src/lib/spatial-coverage/domain/services/CoverageAnalyzer';
import { Voxel } from '../../../src/lib/spatial-coverage/domain/valueObjects/Voxel';
import { Boundary } from '../../../src/lib/spatial-coverage/domain/valueObjects/Boundary';

describe('CoverageAnalyzer', () => {
    const voxelSize = 0.1;
    const boundary = new Boundary([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 }
    ]);

    describe('findGaps', () => {
        it('returns all voxels as gaps when no coverage exists', () => {
            const gaps = CoverageAnalyzer.findGaps([], boundary, voxelSize);
            expect(gaps.length).toBeGreaterThan(0);
        });

        it('returns empty array when fully covered', () => {
            const coveredVoxels: Voxel[] = [];
            for (let x = 0; x < 10; x++) {
                for (let y = 0; y < 10; y++) {
                    coveredVoxels.push(new Voxel(x, y, voxelSize));
                }
            }
            const gaps = CoverageAnalyzer.findGaps(coveredVoxels, boundary, voxelSize);
            expect(gaps.length).toBe(0);
        });

        it('each gap has correct area', () => {
            const gaps = CoverageAnalyzer.findGaps([], boundary, voxelSize);
            gaps.forEach(gap => {
                expect(gap.areaM2).toBeCloseTo(voxelSize * voxelSize, 5);
            });
        });
    });

    describe('findNearestGap', () => {
        it('returns null when no gaps exist', () => {
            const coveredVoxels: Voxel[] = [];
            for (let x = 0; x < 10; x++) {
                for (let y = 0; y < 10; y++) {
                    coveredVoxels.push(new Voxel(x, y, voxelSize));
                }
            }
            const nearest = CoverageAnalyzer.findNearestGap(coveredVoxels, boundary, voxelSize, 0.5, 0.5);
            expect(nearest).toBeNull();
        });

        it('returns the gap closest to given position', () => {
            const covered = [new Voxel(5, 5, voxelSize)]; // One voxel in middle
            const nearest = CoverageAnalyzer.findNearestGap(covered, boundary, voxelSize, 0, 0);
            expect(nearest).not.toBeNull();
            // Should be near origin (0, 0)
            expect(nearest!.centerX).toBeLessThan(0.5);
            expect(nearest!.centerY).toBeLessThan(0.5);
        });
    });

    describe('expectedVoxelCount', () => {
        it('calculates correct expected count', () => {
            const expected = CoverageAnalyzer.expectedVoxelCount(boundary, voxelSize);
            // 1m² boundary with 0.1m voxels = 100 voxels
            expect(expected).toBe(100);
        });
    });
});
