import { Voxel } from '../valueObjects/Voxel';
import { Boundary } from '../valueObjects/Boundary';

/**
 * GapInfo - Information about an uncovered area within the boundary
 */
export interface GapInfo {
    /** Center X coordinate of the gap */
    readonly centerX: number;
    /** Center Y coordinate of the gap */
    readonly centerY: number;
    /** Estimated area of the gap in square meters */
    readonly areaM2: number;
}

/**
 * CoverageAnalyzer - Domain service for analyzing coverage patterns.
 * 
 * Provides gap detection and guidance for guided coverage mode.
 */
export class CoverageAnalyzer {
    /**
     * Find gaps (uncovered areas) within the boundary
     */
    static findGaps(
        coveredVoxels: Voxel[],
        boundary: Boundary,
        voxelSize: number
    ): GapInfo[] {
        const coveredKeys = new Set(coveredVoxels.map(v => v.key));
        const gaps: GapInfo[] = [];

        // Scan the boundary bounding box
        const startX = Math.floor(boundary.minX / voxelSize);
        const endX = Math.ceil(boundary.maxX / voxelSize);
        const startY = Math.floor(boundary.minY / voxelSize);
        const endY = Math.ceil(boundary.maxY / voxelSize);

        for (let gx = startX; gx <= endX; gx++) {
            for (let gy = startY; gy <= endY; gy++) {
                const key = `${gx},${gy}`;
                if (coveredKeys.has(key)) continue;

                // Check if this voxel center is inside the boundary
                const worldX = (gx + 0.5) * voxelSize;
                const worldY = (gy + 0.5) * voxelSize;
                if (!boundary.contains(worldX, worldY)) continue;

                gaps.push({
                    centerX: worldX,
                    centerY: worldY,
                    areaM2: voxelSize * voxelSize
                });
            }
        }

        return gaps;
    }

    /**
     * Get the nearest uncovered voxel to a given position
     */
    static findNearestGap(
        coveredVoxels: Voxel[],
        boundary: Boundary,
        voxelSize: number,
        fromX: number,
        fromY: number
    ): GapInfo | null {
        const gaps = this.findGaps(coveredVoxels, boundary, voxelSize);
        if (gaps.length === 0) return null;

        let nearest = gaps[0];
        let minDist = Math.hypot(nearest.centerX - fromX, nearest.centerY - fromY);

        for (const gap of gaps) {
            const dist = Math.hypot(gap.centerX - fromX, gap.centerY - fromY);
            if (dist < minDist) {
                minDist = dist;
                nearest = gap;
            }
        }

        return nearest;
    }

    /**
     * Calculate expected voxel count for a boundary
     */
    static expectedVoxelCount(boundary: Boundary, voxelSize: number): number {
        return Math.ceil(boundary.area / (voxelSize * voxelSize));
    }
}
