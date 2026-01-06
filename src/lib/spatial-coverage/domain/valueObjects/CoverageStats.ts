/**
 * CoverageStats - Value object containing coverage analysis results.
 */
export interface CoverageStats {
    /** Total area covered in square meters */
    readonly coveredAreaM2: number;
    /** Number of voxels covered */
    readonly voxelCount: number;
    /** Coverage percentage (0-100) relative to boundary, or null if no boundary */
    readonly coveragePercent: number | null;
    /** Expected total area from boundary, or null if no boundary */
    readonly expectedAreaM2: number | null;
    /** True if coverage >= 98% */
    readonly isComplete: boolean;
}

/**
 * Create coverage stats from raw data
 */
export function createCoverageStats(params: {
    voxelCount: number;
    voxelSize: number;
    boundaryArea: number | null;
}): CoverageStats {
    const coveredAreaM2 = params.voxelCount * (params.voxelSize * params.voxelSize);
    const coveragePercent = calculatePercentage(coveredAreaM2, params.boundaryArea);

    return {
        coveredAreaM2,
        voxelCount: params.voxelCount,
        coveragePercent,
        expectedAreaM2: params.boundaryArea,
        isComplete: coveragePercent !== null && coveragePercent >= 98
    };
}

function calculatePercentage(covered: number, boundary: number | null): number | null {
    if (boundary === null || boundary <= 0) {
        return null;
    }
    return Math.min(100, (covered / boundary) * 100);
}
